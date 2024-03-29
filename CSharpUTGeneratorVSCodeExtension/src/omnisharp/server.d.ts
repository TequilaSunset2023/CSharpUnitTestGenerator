
/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as protocol from './protocol';
import { CancellationToken } from './vscodeAdapter';
import { LaunchTarget, SpawnedChildProcess } from './launcher';
import CompositeDisposable from './CompositeDisposable';
import Disposable from './Disposable';

export enum ServerState {
    Starting,
    Started,
    Stopped
}

export type State = {
    status: ServerState.Stopped,
} | {
    status: ServerState.Starting,
    disposables: CompositeDisposable,
} | {
    status: ServerState.Started,
    disposables: CompositeDisposable,
    serverProcess: SpawnedChildProcess,
    telemetryIntervalId: NodeJS.Timeout,
};

export module Events {
    export const StateChanged = 'stateChanged';

    export const StdOut = 'stdout';
    export const StdErr = 'stderr';

    export const Error = 'Error';
    export const ServerError = 'ServerError';

    export const UnresolvedDependencies = 'UnresolvedDependencies';
    export const PackageRestoreStarted = 'PackageRestoreStarted';
    export const PackageRestoreFinished = 'PackageRestoreFinished';

    export const ProjectChanged = 'ProjectChanged';
    export const ProjectAdded = 'ProjectAdded';
    export const ProjectRemoved = 'ProjectRemoved';

    export const BackgroundDiagnosticStatus = 'BackgroundDiagnosticStatus';

    export const MsBuildProjectDiagnostics = 'MsBuildProjectDiagnostics';

    export const TestMessage = 'TestMessage';

    export const BeforeServerInstall = 'BeforeServerInstall';
    export const BeforeServerStart = 'BeforeServerStart';
    export const ServerStart = 'ServerStart';
    export const ServerStop = 'ServerStop';

    export const MultipleLaunchTargets = 'server:MultipleLaunchTargets';

    export const Started = 'started';

    export const ProjectConfiguration = 'ProjectConfiguration';
}

export interface OmniSharpServer {
    decompilationAuthorized: boolean;
    sessionProperties: { [key: string]: any };
    isRunning(): boolean;
    waitForEmptyEventQueue(): Promise<void>;
    getSolutionPathOrFolder(): string | undefined;
    onStdout(listener: (e: string) => any, thisArg?: any): Disposable;
    onStderr(listener: (e: string) => any, thisArg?: any): Disposable;
    onError(listener: (e: protocol.ErrorMessage, thisArg?: any) => any): Disposable;
    onServerError(listener: (err: Error) => any, thisArg?: any): Disposable;
    onUnresolvedDependencies(listener: (e: protocol.UnresolvedDependenciesMessage, thisArg?: any) => any): Disposable;
    onBeforePackageRestore(listener: () => any, thisArg?: any): Disposable;
    onPackageRestore(listener: () => any, thisArg?: any): Disposable;
    onProjectChange(listener: (e: protocol.ProjectInformationResponse) => any, thisArg?: any): Disposable;
    onProjectAdded(listener: (e: protocol.ProjectInformationResponse) => any, thisArg?: any): Disposable;
    onProjectRemoved(listener: (e: protocol.ProjectInformationResponse) => any, thisArg?: any): Disposable;
    onBackgroundDiagnosticStatus(listener: (e: protocol.BackgroundDiagnosticStatusMessage) => any, thisArg?: any) : Disposable;
    onMsBuildProjectDiagnostics(listener: (e: protocol.MSBuildProjectDiagnostics) => any, thisArg?: any): Disposable;
    onTestMessage(listener: (message: protocol.V2.TestMessageEvent) => any, thisArg?: any): Disposable;
    onBeforeServerInstall(listener: () => any): Disposable;
    onBeforeServerStart(listener: () => any): Disposable;
    onServerStart(listener: () => any): Disposable;
    onServerStop(listener: () => any): Disposable;
    onMultipleLaunchTargets(listener: (targets: LaunchTarget[]) => any, thisArg?: any): Disposable;
    onOmnisharpStart(listener: () => any): Disposable;
    stop(): Promise<void>;
    restart(launchTarget: LaunchTarget | undefined): Promise<void>;
    autoStart(preferredPath?: string): Promise<void>;
    makeRequest<TResponse>(command: string, data?: any, token?: CancellationToken): Promise<TResponse>;
}
