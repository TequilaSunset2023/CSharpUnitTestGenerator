export function sleep (time: number | undefined) {
	return new Promise((resolve) => setTimeout(resolve, time));
}