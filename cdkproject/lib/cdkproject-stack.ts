import * as cdk from 'aws-cdk-lib';
import { CfnVPC } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class CdkprojectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Contextから各種設定値を取得
    const systemName = this.node.tryGetContext('systemName');
    const envType = this.node.tryGetContext('envType');

    // VPCを作成する
    new CfnVPC(this, 'Vpc', {
      cidrBlock: '10.0.0.0/16',
      tags: [{ key: 'Name', value: `${systemName}-${envType}-vpc`}]
    });
  }
}
