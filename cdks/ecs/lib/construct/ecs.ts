import { Vpc } from "aws-cdk-lib/aws-ec2";
import { AwsLogDriver, Cluster, CpuArchitecture, FargateTaskDefinition } from "aws-cdk-lib/aws-ecs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface EcsProps {
    vpc: Vpc;
    resourceName: string;
}

export class Ecs extends Construct {
    constructor(scope: Construct, id: string, props: EcsProps) {
        super(scope, id);

        // クラスターを作成
        const cluster = new Cluster(this, "EcsCluster", {
            clusterName: `${props.resourceName}-cluster`,
            vpc: props.vpc,
        });

        // タスク定義の作成
        const taskDef = new FargateTaskDefinition(this, "EcsTaskDefinition", {
            cpu: 256,
            memoryLimitMiB: 512,
            runtimePlatform: {
                cpuArchitecture: CpuArchitecture.X86_64,
            },
        });
        // ログドライバーを作成
        const logDriver = new AwsLogDriver({
            streamPrefix: "ecs",
            logRetention: RetentionDays.ONE_DAY,
        });
    }
}
