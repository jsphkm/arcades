package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2integrations"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfront"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfrontorigins"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsdynamodb"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsssm"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type SnakeWebStackProps struct {
	awscdk.StackProps
	Stage string
}

var stageNameRE = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

func normalizeStage(stage string) (string, error) {
	stage = strings.TrimSpace(strings.ToLower(stage))
	if stage == "" {
		return "", fmt.Errorf("Stage is required")
	}
	if !stageNameRE.MatchString(stage) {
		return "", fmt.Errorf("Stage %q must match [a-z][a-z0-9-]*", stage)
	}
	return stage, nil
}

func NewSnakeWebStack(scope constructs.Construct, id string, props *SnakeWebStackProps) awscdk.Stack {
	if props == nil {
		panic("SnakeWebStackProps is required")
	}

	stage, err := normalizeStage(props.Stage)
	if err != nil {
		panic(err)
	}

	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	bucket := awss3.NewBucket(stack, jsii.String("WebBucket"), &awss3.BucketProps{
		BlockPublicAccess: awss3.BlockPublicAccess_BLOCK_ALL(),
		Encryption:        awss3.BucketEncryption_S3_MANAGED,
		EnforceSSL:        jsii.Bool(true),
		RemovalPolicy:     awscdk.RemovalPolicy_DESTROY,
		AutoDeleteObjects: jsii.Bool(true),
	})

	oac := awscloudfront.NewS3OriginAccessControl(stack, jsii.String("OAC"), &awscloudfront.S3OriginAccessControlProps{
		Signing: awscloudfront.Signing_SIGV4_NO_OVERRIDE(),
	})

	distribution := awscloudfront.NewDistribution(stack, jsii.String("Cdn"), &awscloudfront.DistributionProps{
		DefaultRootObject: jsii.String("index.html"),
		DefaultBehavior: &awscloudfront.BehaviorOptions{
			Origin: awscloudfrontorigins.S3BucketOrigin_WithOriginAccessControl(
				bucket,
				&awscloudfrontorigins.S3BucketOriginWithOACProps{
					OriginAccessControl: oac,
				},
			),
			ViewerProtocolPolicy: awscloudfront.ViewerProtocolPolicy_REDIRECT_TO_HTTPS,
			Compress:             jsii.Bool(true),
			AllowedMethods:       awscloudfront.AllowedMethods_ALLOW_GET_HEAD_OPTIONS(),
			CachedMethods:        awscloudfront.CachedMethods_CACHE_GET_HEAD_OPTIONS(),
		},
		ErrorResponses: &[]*awscloudfront.ErrorResponse{
			{
				HttpStatus:         jsii.Number(403),
				ResponseHttpStatus: jsii.Number(200),
				ResponsePagePath:   jsii.String("/index.html"),
				Ttl:                awscdk.Duration_Seconds(jsii.Number(0)),
			},
			{
				HttpStatus:         jsii.Number(404),
				ResponseHttpStatus: jsii.Number(200),
				ResponsePagePath:   jsii.String("/index.html"),
				Ttl:                awscdk.Duration_Seconds(jsii.Number(0)),
			},
		},
	})

	bucket.AddToResourcePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Sid:       jsii.String("AllowCloudFrontRead"),
		Effect:    awsiam.Effect_ALLOW,
		Actions:   jsii.Strings("s3:GetObject"),
		Resources: jsii.Strings(*bucket.ArnForObjects(jsii.String("*"))),
		Principals: &[]awsiam.IPrincipal{
			awsiam.NewServicePrincipal(jsii.String("cloudfront.amazonaws.com"), nil),
		},
		Conditions: &map[string]any{
			"StringEquals": map[string]string{
				"AWS:SourceArn": *distribution.DistributionArn(),
			},
		},
	}))

	// --- Scores API ---
	table := awsdynamodb.NewTable(stack, jsii.String("Scores"), &awsdynamodb.TableProps{
		PartitionKey: &awsdynamodb.Attribute{
			Name: jsii.String("pk"),
			Type: awsdynamodb.AttributeType_STRING,
		},
		SortKey: &awsdynamodb.Attribute{
			Name: jsii.String("sk"),
			Type: awsdynamodb.AttributeType_STRING,
		},
		BillingMode:   awsdynamodb.BillingMode_PAY_PER_REQUEST,
		RemovalPolicy: awscdk.RemovalPolicy_RETAIN,
	})

	apiDist, err := filepath.Abs(filepath.Join("..", "api", "dist"))
	if err != nil {
		panic(err)
	}
	if _, err := os.Stat(filepath.Join(apiDist, "bootstrap")); err != nil {
		panic("missing api/dist/bootstrap — run scripts/build-scores-api.sh before cdk synth/deploy")
	}

	userPoolID := awscdk.Fn_ImportValue(jsii.String("AccountUserPoolId"))
	userPoolArn := awscdk.Fn_ImportValue(jsii.String("AccountUserPoolArn"))
	arcadesClientID := os.Getenv("ARCADES_CLIENT_ID")
	if arcadesClientID == "" {
		arcadesClientID = os.Getenv("SNAKE_CLIENT_ID") // legacy alias
	}
	if arcadesClientID == "" {
		panic("set ARCADES_CLIENT_ID before cdk synth/deploy")
	}
	adminKeySecretArn := os.Getenv("ADMIN_API_KEY_SECRET_ARN")
	if adminKeySecretArn == "" {
		panic("set ADMIN_API_KEY_SECRET_ARN before cdk synth/deploy")
	}

	fn := awslambda.NewFunction(stack, jsii.String("ScoresApiFn"), &awslambda.FunctionProps{
		Runtime:      awslambda.Runtime_PROVIDED_AL2023(),
		Architecture: awslambda.Architecture_ARM_64(),
		Handler:      jsii.String("bootstrap"),
		Timeout:      awscdk.Duration_Seconds(jsii.Number(30)),
		MemorySize:   jsii.Number(256),
		Environment: &map[string]*string{
			"TABLE_NAME":               table.TableName(),
			"USER_POOL_ID":             userPoolID,
			"ARCADES_CLIENT_ID":        jsii.String(arcadesClientID),
			"SNAKE_CLIENT_ID":          jsii.String(arcadesClientID), // legacy alias for scores API
			"ADMIN_API_KEY_SECRET_ARN": jsii.String(adminKeySecretArn),
			"ADMIN_GROUP_NAME":         jsii.String("identity-admins"),
		},
		Code: awslambda.Code_FromAsset(jsii.String(apiDist), nil),
	})
	table.GrantReadWriteData(fn)
	fn.AddToRolePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   jsii.Strings("secretsmanager:GetSecretValue"),
		Resources: jsii.Strings(adminKeySecretArn),
	}))
	_ = userPoolArn // reserved for future Cognito admin calls

	httpApi := awsapigatewayv2.NewHttpApi(stack, jsii.String("ScoresHttpApi"), &awsapigatewayv2.HttpApiProps{
		ApiName: jsii.String(fmt.Sprintf("snake-scores-%s", stage)),
		CorsPreflight: &awsapigatewayv2.CorsPreflightOptions{
			AllowHeaders: jsii.Strings("authorization", "content-type", "x-api-key"),
			AllowMethods: &[]awsapigatewayv2.CorsHttpMethod{
				awsapigatewayv2.CorsHttpMethod_GET,
				awsapigatewayv2.CorsHttpMethod_POST,
				awsapigatewayv2.CorsHttpMethod_OPTIONS,
			},
			AllowOrigins: jsii.Strings("*"),
			MaxAge:       awscdk.Duration_Hours(jsii.Number(1)),
		},
	})
	integration := awsapigatewayv2integrations.NewHttpLambdaIntegration(
		jsii.String("ScoresIntegration"),
		fn,
		nil,
	)
	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/{proxy+}"),
		Methods:     &[]awsapigatewayv2.HttpMethod{awsapigatewayv2.HttpMethod_ANY},
		Integration: integration,
	})
	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/"),
		Methods:     &[]awsapigatewayv2.HttpMethod{awsapigatewayv2.HttpMethod_ANY},
		Integration: integration,
	})

	prefix := fmt.Sprintf("SnakeWeb-%s", stage)

	webURL := fmt.Sprintf("https://%s", *distribution.DomainName())

	awsssm.NewStringParameter(stack, jsii.String("ScoresApiUrlParam"), &awsssm.StringParameterProps{
		ParameterName: jsii.String(fmt.Sprintf("/arcades/%s/scores-api-url", stage)),
		StringValue:   httpApi.ApiEndpoint(),
	})
	awsssm.NewStringParameter(stack, jsii.String("ArcadesClientIdParam"), &awsssm.StringParameterProps{
		ParameterName: jsii.String(fmt.Sprintf("/arcades/%s/cognito-client-id", stage)),
		StringValue:   jsii.String(arcadesClientID),
	})
	awsssm.NewStringParameter(stack, jsii.String("WebUrlParam"), &awsssm.StringParameterProps{
		ParameterName: jsii.String(fmt.Sprintf("/arcades/%s/web-url", stage)),
		StringValue:   jsii.String(webURL),
	})
	awsssm.NewStringParameter(stack, jsii.String("WebBucketParam"), &awsssm.StringParameterProps{
		ParameterName: jsii.String(fmt.Sprintf("/arcades/%s/web-bucket", stage)),
		StringValue:   bucket.BucketName(),
	})
	awsssm.NewStringParameter(stack, jsii.String("CfDistributionIdParam"), &awsssm.StringParameterProps{
		ParameterName: jsii.String(fmt.Sprintf("/arcades/%s/cf-distribution-id", stage)),
		StringValue:   distribution.DistributionId(),
	})

	awscdk.NewCfnOutput(stack, jsii.String("BucketName"), &awscdk.CfnOutputProps{
		Value:       bucket.BucketName(),
		Description: jsii.String("S3 bucket for Expo web dist"),
		ExportName:  jsii.String(prefix + "-BucketName"),
	})
	awscdk.NewCfnOutput(stack, jsii.String("DistributionId"), &awscdk.CfnOutputProps{
		Value:       distribution.DistributionId(),
		Description: jsii.String("CloudFront distribution id"),
		ExportName:  jsii.String(prefix + "-DistributionId"),
	})
	awscdk.NewCfnOutput(stack, jsii.String("URL"), &awscdk.CfnOutputProps{
		Value:       jsii.String(webURL),
		Description: jsii.String("CloudFront URL"),
		ExportName:  jsii.String(prefix + "-WebURL"),
	})
	awscdk.NewCfnOutput(stack, jsii.String("ScoresApiUrl"), &awscdk.CfnOutputProps{
		Value:       httpApi.ApiEndpoint(),
		Description: jsii.String("Scores HTTP API"),
		ExportName:  jsii.String(prefix + "-ScoresApiUrl"),
	})

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)
	for _, stage := range []string{"prod", "staging"} {
		NewSnakeWebStack(app, "SnakeWeb-"+stage, &SnakeWebStackProps{
			StackProps: awscdk.StackProps{Env: env()},
			Stage:      stage,
		})
	}
	app.Synth(nil)
}

func env() *awscdk.Environment {
	return nil
}
