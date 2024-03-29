import * as cp from "child_process";

export const execShell = (cmd: string, path: string) =>
    new Promise<string>((resolve, reject) => {
        cp.exec(cmd,
            {
                cwd: path,
                env: process.env
            }, (err, out) => {
            if (err) {
                return reject(err);
            }
            return resolve(out);
        });
    }
);