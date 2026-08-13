package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

const apiKeyCacheTTL = 5 * time.Minute

type Principal struct {
	Sub     string
	Email   string
	IsAdmin bool
	IsUser  bool // snake client user
}

type Auth struct {
	secretARN     string
	secrets       *secretsmanager.Client
	userPoolID    string
	region        string
	snakeClientID string
	adminGroup    string

	mu          sync.Mutex
	apiKey      string
	apiKeyUntil time.Time

	jwksMu     sync.Mutex
	jwksCache  jwk.Set
	jwksExpiry time.Time
}

func NewAuth(secrets *secretsmanager.Client) *Auth {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = os.Getenv("AWS_DEFAULT_REGION")
	}
	poolID := os.Getenv("USER_POOL_ID")
	return &Auth{
		secretARN:     os.Getenv("ADMIN_API_KEY_SECRET_ARN"),
		secrets:       secrets,
		userPoolID:    poolID,
		region:        region,
		snakeClientID: firstEnv("ARCADES_CLIENT_ID", "SNAKE_CLIENT_ID"),
		adminGroup:    envOr("ADMIN_GROUP_NAME", "identity-admins"),
	}
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func firstEnv(keys ...string) string {
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			return v
		}
	}
	return ""
}

func (a *Auth) jwksURL() string {
	return fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json", a.region, a.userPoolID)
}

func (a *Auth) AuthorizeAPIKey(ctx context.Context, req events.APIGatewayV2HTTPRequest) bool {
	key, err := a.automationAPIKey(ctx)
	if err != nil || key == "" {
		return false
	}
	for k, v := range req.Headers {
		if strings.EqualFold(k, "x-api-key") && v == key {
			return true
		}
	}
	return false
}

func (a *Auth) AuthorizeBearer(ctx context.Context, req events.APIGatewayV2HTTPRequest) (*Principal, error) {
	authz := header(req, "authorization")
	if authz == "" {
		return nil, fmt.Errorf("missing authorization")
	}
	raw, ok := strings.CutPrefix(authz, "Bearer ")
	if !ok {
		raw, ok = strings.CutPrefix(authz, "bearer ")
		if !ok {
			return nil, fmt.Errorf("invalid authorization")
		}
	}
	set, err := a.jwks(ctx)
	if err != nil {
		return nil, err
	}
	tok, err := jwt.Parse([]byte(raw), jwt.WithKeySet(set), jwt.WithValidate(true))
	if err != nil {
		return nil, err
	}
	issuer := fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", a.region, a.userPoolID)
	if tok.Issuer() != issuer {
		return nil, fmt.Errorf("bad issuer")
	}
	use, ok := tok.Get("token_use")
	if !ok {
		return nil, fmt.Errorf("missing token_use")
	}
	if s, _ := use.(string); s != "access" {
		return nil, fmt.Errorf("access token required")
	}
	clientID := ""
	if cid, ok := tok.Get("client_id"); ok {
		clientID, _ = cid.(string)
	}
	p := &Principal{
		Sub:     tok.Subject(),
		IsAdmin: a.inAdminGroup(tok),
		IsUser:  a.snakeClientID == "" || clientID == a.snakeClientID,
	}
	if email, ok := tok.Get("email"); ok {
		p.Email, _ = email.(string)
	}
	if p.Sub == "" {
		return nil, fmt.Errorf("missing sub")
	}
	return p, nil
}

func (a *Auth) automationAPIKey(ctx context.Context) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.apiKey != "" && time.Now().Before(a.apiKeyUntil) {
		return a.apiKey, nil
	}
	if a.secretARN == "" || a.secrets == nil {
		return "", fmt.Errorf("admin api key secret not configured")
	}
	out, err := a.secrets.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(a.secretARN),
	})
	if err != nil {
		return "", err
	}
	key := strings.TrimSpace(aws.ToString(out.SecretString))
	if key == "" {
		return "", fmt.Errorf("empty admin api key")
	}
	a.apiKey = key
	a.apiKeyUntil = time.Now().Add(apiKeyCacheTTL)
	return key, nil
}

func (a *Auth) inAdminGroup(tok jwt.Token) bool {
	v, ok := tok.Get("cognito:groups")
	if !ok {
		return false
	}
	switch g := v.(type) {
	case []string:
		for _, x := range g {
			if x == a.adminGroup {
				return true
			}
		}
	case []any:
		for _, x := range g {
			if s, ok := x.(string); ok && s == a.adminGroup {
				return true
			}
		}
	}
	return false
}

func (a *Auth) jwks(ctx context.Context) (jwk.Set, error) {
	a.jwksMu.Lock()
	defer a.jwksMu.Unlock()
	if a.jwksCache != nil && time.Now().Before(a.jwksExpiry) {
		return a.jwksCache, nil
	}
	set, err := jwk.Fetch(ctx, a.jwksURL(), jwk.WithHTTPClient(http.DefaultClient))
	if err != nil {
		return nil, err
	}
	a.jwksCache = set
	a.jwksExpiry = time.Now().Add(time.Hour)
	return set, nil
}

func header(req events.APIGatewayV2HTTPRequest, name string) string {
	for k, v := range req.Headers {
		if strings.EqualFold(k, name) {
			return v
		}
	}
	return ""
}
