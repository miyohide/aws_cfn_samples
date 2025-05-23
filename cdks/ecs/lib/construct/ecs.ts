import { SecurityGroup, SubnetSelection, Vpc } from "aws-cdk-lib/aws-ec2";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import { AwsLogDriver, Cluster, ContainerImage, CpuArchitecture, FargateService, FargateTaskDefinition, Secret, TaskDefinitionRevision } from "aws-cdk-lib/aws-ecs";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { DatabaseInstance } from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

interface EcsProps {
    vpc: Vpc;
    resourceName: string;
    ecrRepository: IRepository;
    securityGroup: SecurityGroup;
    subnets: SubnetSelection;
    rdsInstance: DatabaseInstance;
    railsMasterKey: string;
}

export class Ecs extends Construct {
    public readonly fargateService: FargateService;

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

        // Secrets Manager
        const secretsManager = props.rdsInstance.secret!;

        // コンテナ定義を追加
        taskDef.addContainer("EcsContainer", {
            image: ContainerImage.fromEcrRepository(props.ecrRepository, "latest"),
            portMappings: [{
                containerPort: 3000
            }],
            logging: logDriver,
            environment: {
                POSTGRES_HOST: props.rdsInstance.instanceEndpoint.hostname,
                RAILS_ENV: "production",
                RAILS_LOG_TO_STDOUT: "1",
                RAILS_SERVE_STATIC_FILES: "1",
                RAILS_MASTER_KEY: props.railsMasterKey,
            },
            secrets: {
                POSTGRES_USER: Secret.fromSecretsManager(secretsManager, "username"),
                POSTGRES_PASSWORD: Secret.fromSecretsManager(secretsManager, "password"),
            },
        });

        taskDef.addToExecutionRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [secretsManager.secretArn],
            actions: [
                'secretsmanager:GetResourcePolicy',
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
                'secretsmanager:ListSecretVersionIds'
            ]
        }));

        // Fargate
        this.fargateService = new FargateService(this, "EcsFargateService", {
            cluster,
            taskDefinition: taskDef,
            desiredCount: 2,
            securityGroups: [props.securityGroup],
            taskDefinitionRevision: TaskDefinitionRevision.LATEST,
        });
    }
}
