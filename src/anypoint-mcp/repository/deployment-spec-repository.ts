import { APIClient } from "../api-client";
import { AbstractReadOnlyRepository, createStringQueryBuilder, QueryBuilder } from "../repository";

interface DeploymentSpecCriteria {
  limit?: number;
}

interface HttpInbound {
  publicUrl: string;
  lastMileSecurity: boolean;
  forwardSslSession: boolean;
  internalUrl: string;
}

interface ResourceLimit {
  limit: string;
  reserved: string;
}

interface SidecarResources {
  cpu: ResourceLimit;
  memory: ResourceLimit;
}

interface Sidecar {
  image: string;
  resources: SidecarResources;
}

interface DeploymentSettings {
  clustered: boolean;
  enforceDeployingReplicasAcrossNodes: boolean;
  http: {
    inbound: HttpInbound;
  };
  outbound: Record<string, any>;
  jvm: Record<string, any>;
  runtimeVersion: string;
  updateStrategy: string;
  disableAmLogForwarding: boolean;
  persistentObjectStore: boolean;
  anypointMonitoringScope: string;
  sidecars: {
    [key: string]: Sidecar;
  };
  generateDefaultPublicUrl: boolean;
}

interface Target {
  deploymentSettings: DeploymentSettings;
  replicas: number;
}

interface ApplicationRef {
  groupId: string;
  artifactId: string;
  version: string;
  packaging: string;
}

interface LoggingService {
  artifactName: string;
  scopeLoggingConfigurations: any[];
}

interface ApplicationPropertiesService {
  applicationName: string;
  properties: {
    [key: string]: string;
  };
}

interface ApplicationConfiguration {
  "mule.agent.application.properties.service": ApplicationPropertiesService;
  "mule.agent.logging.service": LoggingService;
}

interface Application {
  status: string | null;
  desiredState: "STARTED" | "STOPPED";
  ref: ApplicationRef;
  configuration: ApplicationConfiguration;
  vCores: number;
}

interface DeploymentSpecResponse {
  version: string;
  createdAt: number; // Unix timestamp in milliseconds
  target: Target;
  application: Application;
}

class DeploymentSpecRepository extends AbstractReadOnlyRepository<DeploymentSpecResponse, DeploymentSpecCriteria> {
  constructor(apiClient: APIClient, private readonly environmentId: string, private readonly deploymentId: string) {
    super(apiClient);
  }

  getResourcePath(): string {
    return `/amc/application-manager/api/v2/organizations/${this.apiClient.organizationId}/environments/${this.environmentId}/deployments/${this.deploymentId}/specs`;
  }

  protected queryBuilder: QueryBuilder<DeploymentSpecCriteria> = createStringQueryBuilder<DeploymentSpecCriteria>();
}

export { DeploymentSpecRepository, type DeploymentSpecCriteria, type DeploymentSpecResponse };