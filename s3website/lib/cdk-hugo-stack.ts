import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { CfnOutput } from "aws-cdk-lib";
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib/core';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class CdkHugoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const domainName = new cdk.CfnParameter(this, "domainName", {
      type: "String",
      default: "www.example.com",
      description: "The name of the Amazon S3 bucket and your domain name."});

    // defines an S3 bucket for source files
    const sourceBucket = new s3.Bucket(this, 'sourceBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,  // Block public access
      enforceSSL: true,                                   // Enforce ssl for access
      minimumTLSVersion: 1.2,                             // Enforce minimum version of TLS
    });

    const s3ReadLambdaPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('lambda.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [sourceBucket.arnForObjects('*')]
    });

    // add a policy statement to destinationBucket
    sourceBucket.addToResourcePolicy(s3ReadLambdaPolicy);
    
    // defines an S3 bucket for destination website
    const destinationBucket = new s3.Bucket(this, 'destinationBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      bucketName: domainName.valueAsString,               // Bucket name
      publicReadAccess: true,                             // Enable public read access
      blockPublicAccess: new s3.BlockPublicAccess({       // Turn off public access block
        restrictPublicBuckets: false,
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false
      }),
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,  // Set ownership to the object writer
      websiteIndexDocument: "index.html",                 // Which file to load for root path / 
    });

    // create a policy statement for web public read acccess over s3 destionationBucket
    const s3ReadWebPolicy = new iam.PolicyStatement({
      actions: ['s3:GetObject'],                          // Define which actions this policy is about
      effect: iam.Effect.ALLOW,                           // Effect ALLOW or DENY
      resources: [destinationBucket.arnForObjects('*')],  // All resources in our destinationBucket
      principals: [new iam.AnyPrincipal()]                // Policy applies to all principals
    });
    
    // add a policy statement to destinationBucket
    destinationBucket.addToResourcePolicy(s3ReadWebPolicy);

    // defines an AWS Lambda resource for building hugo static website
    const hugoBuilderLambda = new lambda.Function(this, 'HugoHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,    // execution environment
      timeout: Duration.seconds(20),          // extend timeout to 20 seconds
      environment: {
        source_bucket: sourceBucket.bucketName, // provide source bucket name to the lambda
        destination_bucket: destinationBucket.bucketName, // provide destination bucket name to the lambda
        local_stack: 'false', // provide information are we deploying on aws or localstack
        download_mode: 'zip', // provide download mode zip or file (zip is faster)
        upload_mode: 'none', // provide upload mode clean or none (clean will always delete all objects in destination bucket)
      },
      memorySize: 256,                        // set memory size to 256
      code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
      handler: 'app.lambda_handler'           // entrypoint for lambda execution on invoke
    });

    // create a policy statement
    const s3ListHugoBucketsPolicy = new iam.PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [sourceBucket.bucketArn,destinationBucket.bucketArn],
    });

    const s3GetHugoBucketsPolicy = new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [sourceBucket.arnForObjects('*')],
    });

    const s3RWHugoBucketsPolicy = new iam.PolicyStatement({
      actions: ['s3:GetObject','s3:PutObject','s3:HeadObject','s3:DeleteObject','s3:DeleteObjectVersion'],
      resources: [destinationBucket.arnForObjects('*')],
    });

    // add the policy to the Function's role
    hugoBuilderLambda.role?.attachInlinePolicy(
      new iam.Policy(this, 'hugo-build-bucket-policy', {
        statements: [s3ListHugoBucketsPolicy,s3GetHugoBucketsPolicy,s3RWHugoBucketsPolicy],
      }),
    );
    

    // output values
    new CfnOutput(this, "LambdaName", {
      value: hugoBuilderLambda.functionName,
    });

    new CfnOutput(this, 'SourceBucket', {
      value: sourceBucket.bucketName,
    });
    new CfnOutput(this, 'DestinationBucket', {
      value: destinationBucket.bucketName,
    });
    new CfnOutput(this, 'WebDomain', {
      value: destinationBucket.bucketWebsiteDomainName,
    });
  }
}
