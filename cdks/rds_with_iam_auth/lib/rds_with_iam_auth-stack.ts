import * as cdk from 'aws-cdk-lib';
import { Instance, InstanceClass, InstanceSize, InstanceType, MachineImage, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { CfnInstanceProfile, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class RdsWithIamAuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCを作成する
    const vpc = new Vpc(this, 'Vpc', {
      vpcName: 'MyVPC',
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          // EC2用
          cidrMask: 24,
          name: 'ec2',
          subnetType: SubnetType.PRIVATE_ISOLATED
        },
        {
          // RDS用
          cidrMask: 24,
          name: 'rds',
          subnetType: SubnetType.PRIVATE_ISOLATED
        }
      ]
    });

    const ec2Subnet = vpc.selectSubnets({
      subnetGroupName: 'ec2'
    });

    // EC2インスタンスプロファイル用IAMロールを作成
    const ec2Role = new Role(this, "EC2Role", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      roleName: "EC2Role",
      description: "IAM Role for EC2"
    });
    // IAMロールにSSMのポリシーをアタッチ
    ec2Role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore"
      )
    );
    // アクセスログの保存用にCloudWatchのアクセスポリシーをアタッチ
    ec2Role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "CloudWatchLogsFullAccess"
      )
    );

    // EC2インスタンスを作成する
    const ec2 = new Instance(this, "MyEC2", {
      instanceType: InstanceType.of(
        InstanceClass.T3, InstanceSize.MICRO
      ),
      machineImage: MachineImage.latestAmazonLinux2023(),
      vpc: vpc,
      vpcSubnets: ec2Subnet,
      role: ec2Role,
    });

    // CloudWatchロググループを作成
    const logGroup = new LogGroup(this, "MyLogGroupForSSM", {
      logGroupName: "/ssm/ec2/session",
      retention: RetentionDays.ONE_DAY
    });
  }
}
