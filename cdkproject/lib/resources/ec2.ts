import {CfnInstance, CfnSecurityGroup, CfnSubnet} from "aws-cdk-lib/aws-ec2";
import {Resource} from "./abstract/resource";
import {CfnInstanceProfile} from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";

interface ResourceInfo {
    readonly id: string;
    readonly availabilityZone: string;
    readonly resourceName: string;
    readonly subnetId: () => string;
    readonly assign: (instance: CfnInstance) => void;
}

export class Ec2 extends Resource {
    public instance1a: CfnInstance;
    public instance1c: CfnInstance;

    private static readonly latestImageIdAmazonLinux2023 = 'xxxxx';
    private static readonly instanceType = 't2.micro';
    private readonly subnetApp1a: CfnSubnet;
    private readonly subnetApp1c: CfnSubnet;
    private readonly instanceProfileEc2: CfnInstanceProfile;
    private readonly securityGroupEc2: CfnSecurityGroup;
    private readonly resources: ResourceInfo[] = [
        {
            id: 'Ec2Instance1a',
            availabilityZone: 'ap-northeast-1a',
            resourceName: 'ec2-1a',
            subnetId: () => this.subnetApp1a.ref,
            assign: instance => this.instance1a = instance
        },
        {
            id: 'Ec2Instance1c',
            availabilityZone: 'ap-northeast-1c',
            resourceName: 'ec2-1c',
            subnetId: () => this.subnetApp1c.ref,
            assign: instance => this.instance1c = instance
        }
    ];

    constructor(
        subnetApp1a: CfnSubnet,
        subnetApp1c: CfnSubnet,
        instanceProfileEc2: CfnInstanceProfile,
        securityGroupEc2: CfnSecurityGroup
    ) {
        super();
        this.subnetApp1a = subnetApp1a;
        this.subnetApp1c = subnetApp1c;
        this.instanceProfileEc2 = instanceProfileEc2;
        this.securityGroupEc2 = securityGroupEc2;
    }

    createResources(scope: Construct) {
        for (const resourceInfo of this.resources) {
            const instance = this.createInstance(scope, resourceInfo);
            resourceInfo.assign(instance);
        }
    }

    private createInstance(scope: Construct, resourceInfo: ResourceInfo) {
        const instance = new CfnInstance(scope, resourceInfo.id, {
            availabilityZone: resourceInfo.availabilityZone,
            iamInstanceProfile: this.instanceProfileEc2.ref,
            imageId: Ec2.latestImageIdAmazonLinux2023,
            instanceType: Ec2.instanceType,
            securityGroupIds: [this.securityGroupEc2.attrGroupId],
            subnetId: resourceInfo.subnetId(),
            tags: [{
                key: 'Name',
                value: this.createResourceName(scope, resourceInfo.resourceName)
            }]
        });
        return instance;
    }
}