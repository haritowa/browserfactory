import { Injector } from 'npm:typed-inject'

/**
 * A utility type for extending injectors in a type-safe way
 */
export type InjectorExtender<TBase, TExtension> = <T extends TBase>(injector: Injector<T>) => Injector<T & TExtension>

/**
 * Represents a module that can extend an injector with new dependencies
 */
export interface InjectorModule<TBase, TExtension> {
    /** The function that extends an injector with this module's dependencies */
    extend: InjectorExtender<TBase, TExtension>
}

/**
 * Creates a new injector module with an extender function
 * @param extendFn A function that extends the injector with new dependencies
 * @returns An injector module with an extend function
 */
export function createInjectorModule<TBase, TExtension>(
    extendFn: (injector: Injector<TBase>) => Injector<TBase & TExtension>,
): InjectorModule<TBase, TExtension> {
    // Create the properly typed extender function
    const extend = <T extends TBase>(injector: Injector<T>): Injector<T & TExtension> => {
        return extendFn(injector as Injector<TBase>) as Injector<T & TExtension>
    }

    // Return the module with the extend function
    return { extend }
}
