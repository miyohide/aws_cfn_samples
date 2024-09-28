import * as cdk from 'aws-cdk-lib';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class EcrFromNameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ecrName = this.node.tryGetContext("ecrName");

    const ecr = Repository.fromRepositoryName(this, "ECR", ecrName);

    new cdk.CfnOutput(this, "ECR info", {
      value: ecr.repositoryUri,
    });
  }
}
