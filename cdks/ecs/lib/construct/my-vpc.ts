import { Vpc, IpAddresses, SubnetType, InterfaceVpcEndpointAwsService, GatewayVpcEndpointAwsService, SelectedSubnets } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class MyVpc extends Construct {
    public readonly value: Vpc;
    private readonly ecsSubnetName: string;
    private readonly rdsSubnetName: string;

    constructor(scope: Construct, id: string, private readonly resourceName: string) {
        super(scope, id);
        this.ecsSubnetName = `${this.resourceName}-ecs`;
        this.rdsSubnetName = `${this.resourceName}-rds`;

        // ALBを配置するpublicサブネットと
        // ECSを配置するprivateサブネットと
        // RDSを配置するprivateサブネットを作成する
        this.value = new Vpc(this, "Vpc", {
            vpcName: `${this.resourceName}-vpc`,
            availabilityZones: ["ap-northeast-1a", "ap-northeast-1c"],
            ipAddresses: IpAddresses.cidr("192.168.0.0/16"),
            subnetConfiguration: [
                {
                    name: `${this.resourceName}-public`,
                    cidrMask: 26,
                    subnetType: SubnetType.PUBLIC,
                },
                {
                    name: this.ecsSubnetName,
                    cidrMask: 26,
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                },
                {
                    name: this.rdsSubnetName,
                    cidrMask: 26,
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                },
            ],
            natGateways: 0,
        });

        // VPCエンドポイントを作成
        this.value.addInterfaceEndpoint("EcrEndpoint", {
            service: InterfaceVpcEndpointAwsService.ECR,
        });
        this.value.addInterfaceEndpoint("EcrDkrEndpoint", {
            service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
        });
        this.value.addInterfaceEndpoint("CwLogsEndpoint", {
            service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        });
        this.value.addGatewayEndpoint("S3Endpoint", {
            service: GatewayVpcEndpointAwsService.S3,
            subnets: [
                {
                    subnets: this.value.isolatedSubnets,
                },
            ],
        });
    }

    /**
     * getPublicSubnets
     *
     * パブリックサブネットを返す
     */
    public getPublicSubnets(): SelectedSubnets {
        return this.value.selectSubnets({ subnetType: SubnetType.PUBLIC });
    }

    /**
     * getEcsSubnets
     *
     * ECS用のサブネットを返す
     */
    public getEcsSubnets(): SelectedSubnets {
        return this.value.selectSubnets({ subnetGroupName: this.ecsSubnetName });
    }

    /**
     * getRdsSubnets
     *
     * RDS用のサブネットを返す
     */
    public getRdsSubnets(): SelectedSubnets {
        return this.value.selectSubnets({ subnetGroupName: this.rdsSubnetName });
    }
}
