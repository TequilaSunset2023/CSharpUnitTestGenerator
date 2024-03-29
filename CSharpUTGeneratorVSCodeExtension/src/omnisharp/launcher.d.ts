/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ChildProcessWithoutNullStreams } from 'child_process';

export enum LaunchTargetKind {
    Solution,
    Project,
    ProjectJson,
    Folder,
    Csx,
    Cake,
    LiveShare
}

export interface LaunchTarget {
    label: string;
    description: string;
    directory: string;
    target: string;
    workspaceKind: LaunchTargetKind;
}

export interface SpawnedChildProcess extends ChildProcessWithoutNullStreams {
    pid: number;
}
