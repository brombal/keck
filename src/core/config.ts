type KeckConfig = {
  onError?: (error: unknown) => void;
};

const config: KeckConfig = {};

export function configure(options: Partial<KeckConfig>) {
  Object.assign(config, options);
}

export function resetConfiguration() {
  config.onError = undefined;
}

// Route an error to the configured handler, or rethrow asynchronously so it is never silently swallowed.
export function reportError(error: unknown) {
  if (config.onError) {
    config.onError(error);
  } else {
    setTimeout(() => {
      throw error;
    }, 0);
  }
}
