import * as cdk from 'aws-cdk-lib';
import { CfnSubnet, CfnVPC } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class CdkprojectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Contextから各種設定値を取得
    const systemName = this.node.tryGetContext('systemName');
    const envType = this.node.tryGetContext('envType');

    // VPCを作成する
    const vpc = new CfnVPC(this, 'Vpc', {
      cidrBlock: '10.0.0.0/16',
      tags: [{ key: 'Name', value: `${systemName}-${envType}-vpc`}]
    });

    // サブネットを作成する
    const subnetPublic1a = new CfnSubnet(this, 'SubnetPublic1a', {
      cidrBlock: '10.0.11.0/24',
      vpcId: vpc.ref,
      availabilityZone: 'ap-northeast-1a',
      tags: [{ key: 'Name', value: `${systemName}-${envType}-subnet-public-1a`}]
    });
    const subnetPublic1c = new CfnSubnet(this, 'SubnetPublic1c', {
      cidrBlock: '10.0.12.0/24',
      vpcId: vpc.ref,
      availabilityZone: 'ap-northeast-1c',
      tags: [{ key: 'Name', value: `${systemName}-${envType}-subnet-public-1c`}]
    });

    const subnetApp1a = new CfnSubnet(this, 'SubnetApp1a', {
      cidrBlock: '10.0.21.0/24',
      vpcId: vpc.ref,
      availabilityZone: 'ap-northeast-1a',
      tags: [{ key: 'Name', value: `${systemName}-${envType}-subnet-app-1a`}]
    });
    const subnetApp1c = new CfnSubnet(this, 'SubnetApp1c', {
      cidrBlock: '10.0.22.0/24',
      vpcId: vpc.ref,
      availabilityZone: 'ap-northeast-1c',
      tags: [{ key: 'Name', value: `${systemName}-${envType}-subnet-app-1c`}]
    });

    const subnetDb1a = new CfnSubnet(this, 'SubnetDb1a', {
      cidrBlock: '10.0.31.0/24',
      vpcId: vpc.ref,
      availabilityZone: 'ap-northeast-1a',
      tags: [{ key: 'Name', value: `${systemName}-${envType}-subnet-db-1a`}]
    });
    const subnetDb1c = new CfnSubnet(this, 'SubnetDb1c', {
      cidrBlock: '10.0.32.0/24',
      vpcId: vpc.ref,
      availabilityZone: 'ap-northeast-1c',
      tags: [{ key: 'Name', value: `${systemName}-${envType}-subnet-db-1c`}]
    });
  }
}
