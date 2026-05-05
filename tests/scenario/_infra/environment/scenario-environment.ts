export type SystemScenarioEnvironment = {
  backendBaseUrl: string;
  frontendBaseUrl: string;
};

let currentEnvironment: SystemScenarioEnvironment | null = null;

export function installScenarioEnvironment(
  environment: SystemScenarioEnvironment,
): void {
  currentEnvironment = environment;
}

export function getScenarioEnvironment(): SystemScenarioEnvironment {
  if (!currentEnvironment) {
    throw new Error("System scenario environment has not been installed");
  }
  return currentEnvironment;
}
