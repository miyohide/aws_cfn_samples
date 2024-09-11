import * as cdk from 'aws-cdk-lib';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { MyVpc } from './construct/my-vpc';

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps, readonly resourceName = "sample-ecr-app") {
    super(scope, id, props);

    // ECRを作成する
    const ecr = Repository.fromRepositoryName(
      this,
      "EcrRepository",
      resourceName,
    );

    // VPCを作成する
    const myVpc = new MyVpc(this, "VPC", resourceName);
  }
}
