#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkHugoStack } from '../lib/cdk-hugo-stack';

const app = new cdk.App();
new CdkHugoStack(app, 'CdkHugoStack');
