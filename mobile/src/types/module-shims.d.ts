declare module "@tanstack/react-query" {
  import * as React from "react";

  export class QueryClient {
    invalidateQueries(filters?: { queryKey?: readonly unknown[] }): Promise<void>;
    cancelQueries(filters?: { queryKey?: readonly unknown[] }): Promise<void>;
    getQueryData<T = unknown>(queryKey: readonly unknown[]): T | undefined;
    setQueryData<T = unknown>(
      queryKey: readonly unknown[],
      updater: T | ((oldData: T | undefined) => T | undefined),
    ): void;
  }

  export function QueryClientProvider(props: {
    client: QueryClient;
    children?: React.ReactNode;
  }): React.ReactElement | null;

  export function useQuery<TData = unknown>(options: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<TData>;
    enabled?: boolean;
  }): {
    data: TData | undefined;
    isLoading: boolean;
    isPending: boolean;
    error: unknown;
  };

  export function useMutation<TData = unknown, TVariables = void>(options: {
    mutationFn: (variables: TVariables) => Promise<TData> | TData;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: unknown, variables: TVariables, context: unknown) => void;
    onMutate?: (variables: TVariables) => Promise<unknown> | unknown;
    onSettled?: (data: TData | undefined, error: unknown, variables: TVariables, context: unknown) => void;
  }): {
    mutate: (variables: TVariables) => void;
    isPending: boolean;
  };

  export function useQueryClient(): QueryClient;
}

declare module "axios" {
  export type AxiosRequestConfig = {
    baseURL?: string;
    headers?: Record<string, string>;
  };

  export type AxiosResponse<T = any> = {
    data: T;
  };

  export type AxiosInstance = {
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    interceptors: {
      request: {
        use(onFulfilled: (config: any) => any): void;
      };
    };
  };

  const axios: {
    create(config?: AxiosRequestConfig): AxiosInstance;
  };

  export default axios;
}

declare module "react-hook-form" {
  export function useForm<TFieldValues extends Record<string, any>>(options: {
    defaultValues: TFieldValues;
  }): {
    watch: <TFieldName extends keyof TFieldValues>(name: TFieldName) => TFieldValues[TFieldName];
    setValue: <TFieldName extends keyof TFieldValues>(name: TFieldName, value: TFieldValues[TFieldName]) => void;
    handleSubmit: (
      onValid: (values: TFieldValues) => void | Promise<void>,
    ) => () => void | Promise<void>;
  };
}

declare module "zustand" {
  export function create<TState>(): (
    initializer: (set: (partial: Partial<TState>) => void, get: () => TState) => TState,
  ) => {
    <TSelected>(selector: (state: TState) => TSelected): TSelected;
    (): TState;
    getState(): TState;
  };
}

declare module "zustand/middleware" {
  export function persist<TState>(
    initializer: (set: (partial: Partial<TState>) => void, get: () => TState) => TState,
    options: { name: string; storage?: unknown },
  ): (set: (partial: Partial<TState>) => void, get: () => TState) => TState;

  export function createJSONStorage<TStorage>(getStorage: () => TStorage): TStorage;
}
