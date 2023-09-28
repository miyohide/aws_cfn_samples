import { CfnInstanceProfile, CfnRole, Effect, PolicyDocument, PolicyStatement, PolicyStatementProps, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";

// IAMのリソース情報を定義
interface ResourceInfo {
    readonly id: string;
    readonly policyStatementProps: PolicyStatementProps;
    readonly managedPolicyArns: string[];
    readonly roleName: string;
    readonly assign: (role: CfnRole) => void;
}

export class IamRole extends Resource {
    public ec2: CfnRole;
    public rds: CfnRole;
    public instanceProfileEc2: CfnInstanceProfile;

    // 作成するIAMロールの定義
    private readonly resources: ResourceInfo[] = [
        // RDBにアクセスするEC2にアタッチするIAM
        {
            id: 'RoleEc2',
            policyStatementProps: {
                effect: Effect.ALLOW,
                // 信頼されたエンティティの設定
                principals: [new ServicePrincipal('ec2.amazonaws.com')],
                actions: ['sts:AssumeRole']
            },
            managedPolicyArns: [
                'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
                'arn:aws:iam::aws:policy/AmazonRDSFullAccess'
            ],
            roleName: 'role-ec2',
            assign: role => this.ec2 = role
        },
        // 拡張モニタリングを有効化するためにRDSにアタッチするIAM
        {
            id: 'RoleRds',
            policyStatementProps: {
                effect: Effect.ALLOW,
                // 信頼されたエンティティの設定
                principals: [new ServicePrincipal('monitoring.rds.amazonaws.com')],
                actions: ['sts:AssumeRole']
            },
            managedPolicyArns: [
                'arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole'
            ],
            roleName: 'role-rds',
            assign: role => this.rds = role
        }
    ];

    constructor() {
        super();
    }

    createResources(scope: Construct) {
        for (const resourceInfo of this.resources) {
            const role = this.createRole(scope, resourceInfo);
            resourceInfo.assign(role);
        }

        this.instanceProfileEc2 = new CfnInstanceProfile(scope, 'InstanceProfileEc2', {
            roles: [this.ec2.ref],
            instanceProfileName: this.ec2.roleName
        });
    }

    private createRole(scope: Construct, resourceInfo: ResourceInfo): CfnRole {
        const policyStatement = new PolicyStatement(resourceInfo.policyStatementProps);
        const policyDocument = new PolicyDocument({
            statements: [policyStatement]
        });

        const role = new CfnRole(scope, resourceInfo.id, {
            assumeRolePolicyDocument: policyDocument,
            managedPolicyArns: resourceInfo.managedPolicyArns,
            roleName: this.createResourceName(scope, resourceInfo.roleName)
        });

        return role;
    }
}
