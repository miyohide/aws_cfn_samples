import { Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

interface MySecurityGroupProps {
    vpc: Vpc;
    resourceName: string;
}

export class MySecurityGroup extends Construct {
    public readonly albSecurityGroup: SecurityGroup;
    public readonly ecsSecurityGroup: SecurityGroup;
    public readonly rdsSecurityGroup: SecurityGroup;

    constructor(scope: Construct, id: string, props: MySecurityGroupProps) {
        super(scope, id);
        this.albSecurityGroup = this.createAlbSecurityGroup(props.vpc, props.resourceName);
        this.ecsSecurityGroup = this.createEcsSecurityGroup(props.vpc, props.resourceName);
        this.rdsSecurityGroup = this.createRdsSecurityGroup(props.vpc, props.resourceName);
    }

    private createAlbSecurityGroup(vpc: Vpc, resourceName: string): SecurityGroup {
        const securityGroup = new SecurityGroup(this, "AlbSecurityGroup", {
            securityGroupName: `${resourceName}-alb-sg`,
            vpc,
            description: "Allow HTTP(S) inbound traffic. Allow all outbound trafic",
            allowAllOutbound: true
        });
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.HTTP, "Allow HTTP inbound");
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.HTTPS, "Allow HTTPS inbound");

        return securityGroup;
    }

    private createEcsSecurityGroup(vpc: Vpc, resourceName: string): SecurityGroup {
        const securityGroup = new SecurityGroup(this, "EcsSecurityGroup", {
            securityGroupName: `${resourceName}-ecs-sg`,
            vpc,
            description: "Allow Rails app inbound traffic. Allow all outbound trafic",
            allowAllOutbound: true
        });
        securityGroup.addIngressRule(this.albSecurityGroup, Port.tcp(3000), "Allow Rails app inbound");

        return securityGroup;
    }

    private createRdsSecurityGroup(vpc: Vpc, resourceName: string): SecurityGroup {
        const securityGroup = new SecurityGroup(this, "RdsSecurityGroup", {
            securityGroupName: `${resourceName}-rds-sg`,
            vpc,
            description: "Allow PostgreSQL inbound traffic. Allow all outbound trafic",
            allowAllOutbound: true
        });
        securityGroup.addIngressRule(this.ecsSecurityGroup, Port.POSTGRES, "Allow PostgreSQL inbound");

        return securityGroup;
    }
}