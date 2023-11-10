import { CfnSecret } from "aws-cdk-lib/aws-secretsmanager";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";

export const OSecretKey = {
    MasterUsername: 'MasterUsername',
    MasterUserPassword: 'MasterUserPassword'
} as const;
type SecretKey = typeof OSecretKey[keyof typeof OSecretKey];

interface ResourceInfo {
    readonly id: string;
    readonly description: string;
    readonly generateSecretString: CfnSecret.GenerateSecretStringProperty;
    readonly resourceName: string;
    readonly assign: (secret: CfnSecret) => void;
}

export class SecretsManager extends Resource {
    public rdsCluster: CfnSecret;

    private static readonly rdsClusterMasterUsername = 'admin';
    private readonly resources: ResourceInfo[] = [{
        id: 'SecretRdsCluster',
        description: 'for RDS cluster',
        generateSecretString: {
            excludeCharacters: '"@/\\\'',  // パスワードの除外文字を指定
            generateStringKey: OSecretKey.MasterUserPassword,
            passwordLength: 16,
            secretStringTemplate: `{"OSecretKey.MasterUsername}": "${SecretsManager.rdsClusterMasterUsername}"`
        },
        resourceName: 'secrets-rds-cluster',
        assign: secret => this.rdsCluster = secret
    }];

    constructor() {
        super();
    }

    createResources(scope: Construct) {
        for (const resourceInfo of this.resources) {
            const secret = this.createSecret(scope, resourceInfo);
            resourceInfo.assign(secret);
        }
    }

    public static getDynamicReference(secret: CfnSecret, secretKey: SecretKey): string {
        return `{{resolve:secretsmanager:${secret.ref}:SecretString:${secretKey}}}`;
    }

    private createSecret(scope: Construct, resourceInfo: ResourceInfo): CfnSecret {
        const secret = new CfnSecret(scope, resourceInfo.id, {
            description: resourceInfo.description,
            generateSecretString: resourceInfo.generateSecretString,
            name: this.createResourceName(scope, resourceInfo.resourceName)
        });

        return secret;
    }
}
