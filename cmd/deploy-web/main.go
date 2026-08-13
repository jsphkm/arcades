package main

import (
	"bytes"
	"context"
	"fmt"
	"io/fs"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront"
	cftypes "github.com/aws/aws-sdk-go-v2/service/cloudfront/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func main() {
	ctx := context.Background()

	bucket := os.Getenv("ARCADES_WEB_BUCKET")
	if bucket == "" {
		bucket = os.Getenv("SNAKE_WEB_BUCKET")
	}
	distID := os.Getenv("ARCADES_CF_DISTRIBUTION_ID")
	if distID == "" {
		distID = os.Getenv("SNAKE_CF_DISTRIBUTION_ID")
	}
	root := os.Getenv("ARCADES_WEB_DIST")
	if root == "" {
		root = os.Getenv("SNAKE_WEB_DIST")
	}
	if root == "" {
		root = "rn/dist"
	}
	if bucket == "" || distID == "" {
		fatalf("set ARCADES_WEB_BUCKET and ARCADES_CF_DISTRIBUTION_ID (use scripts/deploy-web.sh prod|staging)")
	}

	absRoot, err := filepath.Abs(root)
	if err != nil {
		fatalf("resolve dist: %v", err)
	}
	if _, err := os.Stat(filepath.Join(absRoot, "index.html")); err != nil {
		fatalf("missing %s/index.html — run: cd rn && npx expo export -p web", absRoot)
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		fatalf("aws config: %v", err)
	}
	s3c := s3.NewFromConfig(cfg)
	cfc := cloudfront.NewFromConfig(cfg)

	var uploaded int
	err = filepath.WalkDir(absRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}

		rel, err := filepath.Rel(absRoot, path)
		if err != nil {
			return err
		}
		key := filepath.ToSlash(rel)

		body, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		contentType := mime.TypeByExtension(filepath.Ext(path))
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		switch strings.ToLower(filepath.Ext(path)) {
		case ".html":
			contentType = "text/html; charset=utf-8"
		case ".js":
			contentType = "application/javascript; charset=utf-8"
		case ".css":
			contentType = "text/css; charset=utf-8"
		case ".json":
			contentType = "application/json; charset=utf-8"
		case ".svg":
			contentType = "image/svg+xml"
		case ".wasm":
			contentType = "application/wasm"
		}

		cacheControl := "public, max-age=31536000, immutable"
		if strings.EqualFold(filepath.Ext(path), ".html") {
			cacheControl = "public, max-age=0, must-revalidate"
		}

		_, err = s3c.PutObject(ctx, &s3.PutObjectInput{
			Bucket:       aws.String(bucket),
			Key:          aws.String(key),
			Body:         bytes.NewReader(body),
			ContentType:  aws.String(contentType),
			CacheControl: aws.String(cacheControl),
		})
		if err != nil {
			return fmt.Errorf("put %s: %w", key, err)
		}
		uploaded++
		fmt.Println("uploaded", key)
		return nil
	})
	if err != nil {
		fatalf("upload: %v", err)
	}

	callerRef := fmt.Sprintf("arcades-web-%d", time.Now().UnixNano())
	_, err = cfc.CreateInvalidation(ctx, &cloudfront.CreateInvalidationInput{
		DistributionId: aws.String(distID),
		InvalidationBatch: &cftypes.InvalidationBatch{
			CallerReference: aws.String(callerRef),
			Paths: &cftypes.Paths{
				Quantity: aws.Int32(1),
				Items:    []string{"/*"},
			},
		},
	})
	if err != nil {
		fatalf("invalidate: %v", err)
	}

	fmt.Printf("done: %d files → s3://%s (invalidated %s)\n", uploaded, bucket, distID)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
