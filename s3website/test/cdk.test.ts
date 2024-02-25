import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as Cdk from '../lib/cdk-hugo-stack';

test('S3 Buckets Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Cdk.CdkHugoStack(app, 'MyTestStack');
  // THEN

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    OwnershipControls: {}
  });
  template.resourceCountIs('AWS::S3::Bucket', 2);
});

test('Lambda Function Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Cdk.CdkHugoStack(app, 'MyTestStack');
  // THEN

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Lambda::Function', 1);
});
