package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/google/uuid"
)

type Handler struct {
	store *Store
	auth  *Auth
}

func main() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		panic(err)
	}
	sm := secretsmanager.NewFromConfig(cfg)
	h := &Handler{
		store: NewStore(dynamodb.NewFromConfig(cfg)),
		auth:  NewAuth(sm),
	}
	lambda.Start(h.Serve)
}

func (h *Handler) Serve(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	method := req.RequestContext.HTTP.Method
	if method == http.MethodOptions {
		return cors(http.StatusNoContent, ""), nil
	}

	path := strings.TrimSuffix(req.RawPath, "/")
	if path == "" {
		path = "/"
	}

	switch {
	case method == http.MethodGet && path == "/v1/scores/leaderboard":
		return h.getLeaderboard(ctx, req)
	case method == http.MethodPost && path == "/v1/scores":
		return h.postScore(ctx, req)
	case method == http.MethodGet && path == "/v1/scores/me":
		return h.getMyScores(ctx, req)
	case method == http.MethodGet && path == "/v1/scores":
		return h.getAllScores(ctx, req)
	default:
		return corsJSON(http.StatusNotFound, map[string]string{"error": "not found"}), nil
	}
}

func (h *Handler) getLeaderboard(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	limit := int32(LeaderboardCap)
	game := GameSnake
	if req.QueryStringParameters != nil {
		if v := req.QueryStringParameters["limit"]; v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				limit = int32(n)
			}
		}
		if v := req.QueryStringParameters["game"]; v != "" {
			game = v
		}
	}
	if NormalizeGame(game) == "" {
		return corsJSON(http.StatusBadRequest, map[string]string{"error": "invalid game"}), nil
	}
	items, err := h.store.ListLeaderboard(ctx, limit, game)
	if err != nil {
		return corsJSON(http.StatusInternalServerError, map[string]string{"error": err.Error()}), nil
	}
	out := make([]map[string]any, 0, len(items))
	for i, r := range items {
		out = append(out, scoreJSON(r, i+1))
	}
	resp := corsJSON(http.StatusOK, map[string]any{"scores": out, "game": NormalizeGame(game)})
	resp.Headers["cache-control"] = "public, max-age=5"
	return resp, nil
}

func (h *Handler) postScore(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	p, err := h.auth.AuthorizeBearer(ctx, req)
	if err != nil || p == nil || !p.IsUser {
		return corsJSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"}), nil
	}
	var body struct {
		Score     int    `json:"score"`
		Device    string `json:"device"`
		UserAgent string `json:"userAgent"`
		Game      string `json:"game"`
	}
	if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
		return corsJSON(http.StatusBadRequest, map[string]string{"error": "invalid json"}), nil
	}
	if body.Score < 0 || body.Score > MaxScore {
		return corsJSON(http.StatusBadRequest, map[string]string{"error": "score out of range"}), nil
	}
	game := NormalizeGame(body.Game)
	if game == "" {
		return corsJSON(http.StatusBadRequest, map[string]string{"error": "invalid game"}), nil
	}
	rec := ScoreRecord{
		Game:      game,
		UserSub:   p.Sub,
		Email:     p.Email,
		Score:     body.Score,
		PlayedAt:  time.Now().UTC().Format(time.RFC3339Nano),
		Device:    truncate(body.Device, 80),
		UserAgent: truncate(body.UserAgent, 256),
		RunID:     uuid.NewString(),
	}
	if err := h.store.PutRun(ctx, rec); err != nil {
		return corsJSON(http.StatusInternalServerError, map[string]string{"error": err.Error()}), nil
	}
	onBoard, err := h.store.UpsertLeaderboard(ctx, rec)
	if err != nil {
		return corsJSON(http.StatusInternalServerError, map[string]string{"error": err.Error()}), nil
	}
	return corsJSON(http.StatusCreated, map[string]any{
		"runId":         rec.RunID,
		"playedAt":      rec.PlayedAt,
		"score":         rec.Score,
		"game":          rec.Game,
		"onLeaderboard": onBoard,
	}), nil
}

func (h *Handler) getMyScores(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	p, err := h.auth.AuthorizeBearer(ctx, req)
	if err != nil || p == nil || !p.IsUser {
		return corsJSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"}), nil
	}
	cursor := ""
	game := ""
	if req.QueryStringParameters != nil {
		cursor = req.QueryStringParameters["cursor"]
		game = req.QueryStringParameters["game"]
	}
	if game != "" && NormalizeGame(game) == "" {
		return corsJSON(http.StatusBadRequest, map[string]string{"error": "invalid game"}), nil
	}
	items, next, err := h.store.ListUserRuns(ctx, p.Sub, 50, cursor, game)
	if err != nil {
		return corsJSON(http.StatusInternalServerError, map[string]string{"error": err.Error()}), nil
	}
	out := make([]map[string]any, 0, len(items))
	for _, r := range items {
		out = append(out, scoreJSON(r, 0))
	}
	return corsJSON(http.StatusOK, map[string]any{"scores": out, "nextCursor": next}), nil
}

func (h *Handler) getAllScores(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	if !h.auth.AuthorizeAPIKey(ctx, req) {
		p, err := h.auth.AuthorizeBearer(ctx, req)
		if err != nil || p == nil || !p.IsAdmin {
			return corsJSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"}), nil
		}
	}
	startPK, startSK := "", ""
	if req.QueryStringParameters != nil {
		startPK = req.QueryStringParameters["cursorPk"]
		startSK = req.QueryStringParameters["cursorSk"]
	}
	items, nextPK, nextSK, err := h.store.ListAllRuns(ctx, 50, startPK, startSK)
	if err != nil {
		return corsJSON(http.StatusInternalServerError, map[string]string{"error": err.Error()}), nil
	}
	out := make([]map[string]any, 0, len(items))
	for _, r := range items {
		out = append(out, scoreJSON(r, 0))
	}
	return corsJSON(http.StatusOK, map[string]any{
		"scores":      out,
		"nextCursorPk": nextPK,
		"nextCursorSk": nextSK,
	}), nil
}

func scoreJSON(r ScoreRecord, rank int) map[string]any {
	game := r.Game
	if game == "" {
		game = GameSnake
	}
	m := map[string]any{
		"userSub":   r.UserSub,
		"email":     r.Email,
		"score":     r.Score,
		"game":      game,
		"playedAt":  r.PlayedAt,
		"device":    r.Device,
		"userAgent": r.UserAgent,
		"runId":     r.RunID,
	}
	if rank > 0 {
		m["rank"] = rank
	}
	return m
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func corsJSON(status int, body any) events.APIGatewayV2HTTPResponse {
	b, _ := json.Marshal(body)
	return cors(status, string(b))
}

func cors(status int, body string) events.APIGatewayV2HTTPResponse {
	return events.APIGatewayV2HTTPResponse{
		StatusCode: status,
		Headers: map[string]string{
			"content-type":                 "application/json",
			"access-control-allow-origin":  "*",
			"access-control-allow-headers": "authorization,content-type,x-api-key",
			"access-control-allow-methods": "GET,POST,OPTIONS",
		},
		Body: body,
	}
}
