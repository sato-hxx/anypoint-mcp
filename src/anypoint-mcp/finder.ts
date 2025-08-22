import { AbstractReadOnlyRepository } from "./repository";

/**
 * Trait interfaces for searchable entities
 */
interface Nameable {
  name: string;
}

/**
 * Finder for entities with name property
 * 
 * @template T The target entity type (must have name property)
 * 
 * @example
 * ```typescript
 * const finder = new NameableFinder(new EnvironmentRepository(apiClient));
 * const env = await finder.findByName("Production");
 * if (!env) {
 *   throw new ResourceNotFoundError(`Environment not found`);
 * }
 * console.log(`Found environment: ${env.name} (${env.id})`);
 * ```
 */
class NameableFinder<T extends Nameable> {
  constructor(private repository: AbstractReadOnlyRepository<T>) {}
  
  /**
   * Find entity by name
   * 
   * @param name The name to search for (case-insensitive)
   * @returns The found entity, or undefined if not found
   */
  async findByName(name: string): Promise<T | undefined> {
    return ( await this.repository.findAll() ).find( entity => entity.name.toLowerCase() === name.toLowerCase() );
  }
}

interface Versionable {
  version: string;
}

/**
 * Finder for entities with version property
 * 
 * @template T The target entity type (must have version property)
 * 
 * @example
 * ```typescript
 * const finder = new VersionableFinder(new DeploymentSpecRepository(apiClient, envId, deploymentId));
 * const spec = await finder.findByVersion("1.0.0");
 * ```
 */
class VersionableFinder<T extends Versionable> {
  constructor(private repository: AbstractReadOnlyRepository<T>) {}
  
  /**
   * Find entity by version
   * 
   * @param version The version to search for
   * @returns The found entity, or undefined if not found
   */
  async findByVersion(version: string): Promise<T | undefined> {
    return ( await this.repository.findAll() ).find( entity => entity.version === version );
  }
}

export { NameableFinder, VersionableFinder };