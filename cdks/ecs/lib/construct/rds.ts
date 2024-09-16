import { InstanceClass, InstanceSize, InstanceType, SecurityGroup, SubnetSelection, Vpc } from "aws-cdk-lib/aws-ec2";
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, DatabaseInstanceReadReplica, NetworkType, PostgresEngineVersion } from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

interface RdsProps {
    resourceName: string;
    vpc: Vpc;
    securityGroup: SecurityGroup;
    subnets: SubnetSelection;
}

export class Rds extends Construct {
    constructor(scope: Construct, id: string, props: RdsProps) {
        super(scope, id);

        const rdsCredentials = Credentials.fromGeneratedSecret("myrdsuser", {
            secretName: `/${props.resourceName}/rds/`,
        });

        // プライマリインスタンスを作成する
        const rdsPrimaryInstance = new DatabaseInstance(this, "RdsPrimaryInstance", {
            engine: DatabaseInstanceEngine.postgres({
                version: PostgresEngineVersion.VER_16_4,
            }),
            instanceType: InstanceType.of(
                InstanceClass.T3,
                InstanceSize.MICRO,
            ),
            credentials: rdsCredentials,
            databaseName: "myrds",
            vpc: props.vpc,
            vpcSubnets: props.subnets,
            networkType: NetworkType.IPV4,
            securityGroups: [props.securityGroup],
            availabilityZone: "ap-northeast-1a",
        });

        // リードレプリカの作成
        new DatabaseInstanceReadReplica(this, "RdsReadReplica", {
            sourceDatabaseInstance: rdsPrimaryInstance,
            instanceType: InstanceType.of(
                InstanceClass.T3,
                InstanceSize.MICRO,
            ),
            vpc: props.vpc,
            vpcSubnets: props.subnets,
            networkType: NetworkType.IPV4,
            securityGroups: [props.securityGroup],
            availabilityZone: "ap-northeast-1c",
            autoMinorVersionUpgrade: false,
        });
    }
}