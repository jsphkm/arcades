package main

import (
	"fmt"
    "strings"
    "regexp"
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfront"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfrontorigins"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
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
    if stage == "" { return "", fmt.Errorf("Stage is required") }
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
    if err != nil { panic(err) }
    
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
		Sid:    jsii.String("AllowCloudFrontRead"),
		Effect: awsiam.Effect_ALLOW,
		Actions: jsii.Strings("s3:GetObject"),
		Resources: jsii.Strings(
			*bucket.ArnForObjects(jsii.String("*")),
		),
		Principals: &[]awsiam.IPrincipal{
			awsiam.NewServicePrincipal(jsii.String("cloudfront.amazonaws.com"), nil),
		},
		Conditions: &map[string]any{
			"StringEquals": map[string]string{
				"AWS:SourceArn": *distribution.DistributionArn(),
			},
		},
	}))

    prefix := fmt.Sprintf("SnakeWeb-%s", stage)

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
		Value:       jsii.String(fmt.Sprintf("https://%s", *distribution.DomainName())),
		Description: jsii.String("CloudFront URL"),
		ExportName:  jsii.String(prefix + "-WebURL"),
	})

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)
	for _, stage := range []string { "prod", "staging" } {
        NewSnakeWebStack(app, "SnakeWeb-"+stage, &SnakeWebStackProps {
            StackProps: awscdk.StackProps { Env: env() },
            Stage: stage,
        })
	}
	app.Synth(nil)
}

func env() *awscdk.Environment {
	// nil = default account/region from the caller's AWS credentials
	return nil
}
