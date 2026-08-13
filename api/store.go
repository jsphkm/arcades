package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

const (
	MaxScore       = 1_000_000
	LeaderboardCap = 100
	leaderboardPK  = "LEADERBOARD"
)

type ScoreRecord struct {
	PK        string `dynamodbav:"pk" json:"-"`
	SK        string `dynamodbav:"sk" json:"-"`
	Type      string `dynamodbav:"type" json:"-"`
	UserSub   string `dynamodbav:"userSub" json:"userSub"`
	Email     string `dynamodbav:"email,omitempty" json:"email,omitempty"`
	Score     int    `dynamodbav:"score" json:"score"`
	PlayedAt  string `dynamodbav:"playedAt" json:"playedAt"`
	Device    string `dynamodbav:"device,omitempty" json:"device,omitempty"`
	UserAgent string `dynamodbav:"userAgent,omitempty" json:"userAgent,omitempty"`
	RunID     string `dynamodbav:"runId" json:"runId"`
}

type Store struct {
	db    *dynamodb.Client
	table string
}

func NewStore(db *dynamodb.Client) *Store {
	return &Store{db: db, table: os.Getenv("TABLE_NAME")}
}

func userPK(sub string) string { return "USER#" + sub }

func runSK(playedAt, runID string) string {
	return "RUN#" + playedAt + "#" + runID
}

func leaderboardSK(score int, playedAt, sub string) string {
	inv := MaxScore - score
	if inv < 0 {
		inv = 0
	}
	return fmt.Sprintf("SCORE#%010d#%s#%s", inv, playedAt, sub)
}

func (s *Store) PutRun(ctx context.Context, rec ScoreRecord) error {
	if rec.RunID == "" {
		rec.RunID = uuid.NewString()
	}
	if rec.PlayedAt == "" {
		rec.PlayedAt = time.Now().UTC().Format(time.RFC3339Nano)
	}
	rec.PK = userPK(rec.UserSub)
	rec.SK = runSK(rec.PlayedAt, rec.RunID)
	rec.Type = "run"
	item, err := attributevalue.MarshalMap(rec)
	if err != nil {
		return err
	}
	_, err = s.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.table),
		Item:      item,
	})
	return err
}

func (s *Store) ListUserRuns(ctx context.Context, sub string, limit int32, startSK string) ([]ScoreRecord, string, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	in := &dynamodb.QueryInput{
		TableName:              aws.String(s.table),
		KeyConditionExpression: aws.String("pk = :pk AND begins_with(sk, :prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk":     &types.AttributeValueMemberS{Value: userPK(sub)},
			":prefix": &types.AttributeValueMemberS{Value: "RUN#"},
		},
		ScanIndexForward: aws.Bool(false),
		Limit:            aws.Int32(limit),
	}
	if startSK != "" {
		in.ExclusiveStartKey = map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: userPK(sub)},
			"sk": &types.AttributeValueMemberS{Value: startSK},
		}
	}
	out, err := s.db.Query(ctx, in)
	if err != nil {
		return nil, "", err
	}
	items := make([]ScoreRecord, 0, len(out.Items))
	for _, item := range out.Items {
		var r ScoreRecord
		if err := attributevalue.UnmarshalMap(item, &r); err != nil {
			return nil, "", err
		}
		items = append(items, r)
	}
	next := ""
	if out.LastEvaluatedKey != nil {
		if sk, ok := out.LastEvaluatedKey["sk"].(*types.AttributeValueMemberS); ok {
			next = sk.Value
		}
	}
	return items, next, nil
}

func (s *Store) ListAllRuns(ctx context.Context, limit int32, startPK, startSK string) ([]ScoreRecord, string, string, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	in := &dynamodb.ScanInput{
		TableName:        aws.String(s.table),
		FilterExpression: aws.String("#t = :run"),
		ExpressionAttributeNames: map[string]string{
			"#t": "type",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":run": &types.AttributeValueMemberS{Value: "run"},
		},
		Limit: aws.Int32(limit),
	}
	if startPK != "" && startSK != "" {
		in.ExclusiveStartKey = map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: startPK},
			"sk": &types.AttributeValueMemberS{Value: startSK},
		}
	}
	out, err := s.db.Scan(ctx, in)
	if err != nil {
		return nil, "", "", err
	}
	items := make([]ScoreRecord, 0, len(out.Items))
	for _, item := range out.Items {
		var r ScoreRecord
		if err := attributevalue.UnmarshalMap(item, &r); err != nil {
			return nil, "", "", err
		}
		items = append(items, r)
	}
	nextPK, nextSK := "", ""
	if out.LastEvaluatedKey != nil {
		if pk, ok := out.LastEvaluatedKey["pk"].(*types.AttributeValueMemberS); ok {
			nextPK = pk.Value
		}
		if sk, ok := out.LastEvaluatedKey["sk"].(*types.AttributeValueMemberS); ok {
			nextSK = sk.Value
		}
	}
	return items, nextPK, nextSK, nil
}

func (s *Store) ListLeaderboard(ctx context.Context, limit int32) ([]ScoreRecord, error) {
	if limit <= 0 || limit > LeaderboardCap {
		limit = LeaderboardCap
	}
	out, err := s.db.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(s.table),
		KeyConditionExpression: aws.String("pk = :pk"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: leaderboardPK},
		},
		ScanIndexForward: aws.Bool(true),
		Limit:            aws.Int32(limit),
	})
	if err != nil {
		return nil, err
	}
	items := make([]ScoreRecord, 0, len(out.Items))
	for _, item := range out.Items {
		var r ScoreRecord
		if err := attributevalue.UnmarshalMap(item, &r); err != nil {
			return nil, err
		}
		items = append(items, r)
	}
	return items, nil
}

func (s *Store) leaderboardCount(ctx context.Context) (int, error) {
	out, err := s.db.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(s.table),
		KeyConditionExpression: aws.String("pk = :pk"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: leaderboardPK},
		},
		Select: types.SelectCount,
	})
	if err != nil {
		return 0, err
	}
	return int(out.Count), nil
}

func (s *Store) lowestLeaderboard(ctx context.Context) (*ScoreRecord, error) {
	out, err := s.db.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(s.table),
		KeyConditionExpression: aws.String("pk = :pk"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: leaderboardPK},
		},
		ScanIndexForward: aws.Bool(false),
		Limit:            aws.Int32(1),
	})
	if err != nil {
		return nil, err
	}
	if len(out.Items) == 0 {
		return nil, nil
	}
	var r ScoreRecord
	if err := attributevalue.UnmarshalMap(out.Items[0], &r); err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *Store) UpsertLeaderboard(ctx context.Context, rec ScoreRecord) (bool, error) {
	count, err := s.leaderboardCount(ctx)
	if err != nil {
		return false, err
	}
	lowest, err := s.lowestLeaderboard(ctx)
	if err != nil {
		return false, err
	}
	if count >= LeaderboardCap && lowest != nil && rec.Score < lowest.Score {
		return false, nil
	}

	board := rec
	board.PK = leaderboardPK
	board.SK = leaderboardSK(rec.Score, rec.PlayedAt, rec.UserSub)
	board.Type = "leaderboard"
	item, err := attributevalue.MarshalMap(board)
	if err != nil {
		return false, err
	}
	if _, err := s.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.table),
		Item:      item,
	}); err != nil {
		return false, err
	}

	for {
		count, err = s.leaderboardCount(ctx)
		if err != nil {
			return true, err
		}
		if count <= LeaderboardCap {
			break
		}
		lowest, err = s.lowestLeaderboard(ctx)
		if err != nil || lowest == nil {
			break
		}
		_, _ = s.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
			TableName: aws.String(s.table),
			Key: map[string]types.AttributeValue{
				"pk": &types.AttributeValueMemberS{Value: lowest.PK},
				"sk": &types.AttributeValueMemberS{Value: lowest.SK},
			},
		})
	}
	return true, nil
}
