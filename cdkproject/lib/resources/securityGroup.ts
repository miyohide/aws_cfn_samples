import { CfnSecurityGroup, CfnSecurityGroupIngress, CfnSecurityGroupIngressProps, CfnVPC } from "aws-cdk-lib/aws-ec2";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";

interface IngressInfo {
    readonly id: string;
    readonly securityGroupIngressProps: CfnSecurityGroupIngressProps;
    readonly groupId: () => string;
    readonly sourceSecurityGroupId?: () => string;
}

interface ResourceInfo {
    readonly id: string;
    readonly groupDescription: string;
    readonly ingresses: IngressInfo[];
    readonly resourceName: string;
    readonly assign: (SecurityGroup: CfnSecurityGroup) => void;
}

export class SecurityGroup extends Resource {
    public alb: CfnSecurityGroup;
    public ec2: CfnSecurityGroup;
    public rds: CfnSecurityGroup;

    private readonly vpc: CfnVPC;
    private readonly resources: ResourceInfo[] = [
        {
            id: "SecurityGroupAlb",
            groupDescription: "for ALB",
            ingresses: [
                {
                    // ALBに対するセキュリティグループ。ポート80（HTTP）
                    id: "SecurityGroupIngressAlb1",
                    securityGroupIngressProps: {
                        ipProtocol: "tcp",
                        cidrIp: "0.0.0.0/0",
                        fromPort: 80,
                        toPort: 80
                    },
                    groupId: () => this.alb.attrGroupId
                },
                {
                    // ALBに対するセキュリティグループ。ポート443（HTTPS）
                    id: "SecurityGroupIngressAlb2",
                    securityGroupIngressProps: {
                        ipProtocol: "tcp",
                        cidrIp: "0.0.0.0/0",
                        fromPort: 443,
                        toPort: 443
                    },
                    groupId: () => this.alb.attrGroupId
                }
            ],
            resourceName: "sg-alb",
            assign: securityGroup => this.alb = securityGroup
        },
        {
            // EC2に対するセキュリティグループ。ALBからEC2のみ適用
            id: "SecurityGroupEc2",
            groupDescription: "for EC2",
            ingresses: [
                {
                    id: "SecurityGroupIngressEc21",
                    securityGroupIngressProps: {
                        ipProtocol: "tcp",
                        fromPort: 80,
                        toPort: 80
                    },
                    groupId: () => this.ec2.attrGroupId,
                    sourceSecurityGroupId: () => this.alb.attrGroupId,
                }
            ],
            resourceName: "sg-ec2",
            assign: securityGroup => this.ec2 = securityGroup
        },
        {
            // RDSに対するセキュリティグループ。EC2からRDSにMySQLポートだけ有効
            id: "SecurityGroupRds",
            groupDescription: "for RDS",
            ingresses: [
                {
                    id: "SecurityGroupIngressRds1",
                    securityGroupIngressProps: {
                        ipProtocol: "tcp",
                        fromPort: 3306,
                        toPort: 3306
                    },
                    groupId: () => this.rds.attrGroupId,
                    sourceSecurityGroupId: () => this.ec2.attrGroupId,
                }
            ],
            resourceName: "sg-rds",
            assign: securityGroup => this.rds = securityGroup
        }
    ];

    constructor(vpc: CfnVPC) {
        super();
        this.vpc = vpc;
    };

    createResources(scope: Construct) {
        for (const resourceInfo of this.resources) {
            const securityGroup = this.createSecurityGroup(scope, resourceInfo);
            resourceInfo.assign(securityGroup);

            this.createSecurityGroupIngress(scope, resourceInfo);
        }
    };


    // セキュリティグループを作成する。
    private createSecurityGroup(scope: Construct, resourceInfo: ResourceInfo) {
        const resourceName = this.createResourceName(scope, resourceInfo.resourceName);
        const securityGroup = new CfnSecurityGroup(scope, resourceInfo.id, {
            groupDescription: resourceInfo.groupDescription,
            groupName: resourceName,
            vpcId: this.vpc.ref,
            tags: [{
                key: "Name",
                value: resourceName
            }]
        });

        return securityGroup;
    };

    // インバウンドルールの設定を行う
    private createSecurityGroupIngress(scope: Construct, resourceInfo: ResourceInfo) {
        for (const ingress of resourceInfo.ingresses) {
            const securityGroupIngress = new CfnSecurityGroupIngress(scope, ingress.id, ingress.securityGroupIngressProps);
            securityGroupIngress.groupId = ingress.groupId();

            if (ingress.sourceSecurityGroupId) {
                securityGroupIngress.sourceSecurityGroupId = ingress.sourceSecurityGroupId();
            }
        }
    }
}
