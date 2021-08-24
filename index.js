const path = require("path");
const core = require("@actions/core");
const aws = require("aws-sdk");
const tmp = require("tmp");
const fs = require("fs");

const ssm = new aws.SSM({
  apiVersion: "2014–11–06",
});

const recursiveGetParametersByPath = async (path) => {
  let allParameter = [];
  const params = {
    Path: path,
    ParameterFilters: [],
    Recursive: true,
    WithDecryption: false,
  };
  let results = await ssm.getParametersByPath(params).promise();
  if (results.Parameters.length == 0) {
    console.log(`Error result is empty`);
    return [];
  }
  allParameter = allParameter.concat(results.Parameters);
  while (results.NextToken) {
    params.NextToken = results.NextToken;
    results = await ssm.getParametersByPath(params).promise();
    allParameter = allParameter.concat(results.Parameters);
  }
  return allParameter;
};

async function run() {
  try {
    // Get inputs
    const taskDefinitionFile = core.getInput("task-definition", { required: true });
    const containerName = core.getInput("container-name", { required: true });
    const secretsWildcard = core.getInput("secretsWildcard", { required: true });
    const region = core.getInput("aws_region", { required: false });

    if (region) aws.config.region = region;
    // Parse the task definition
    const taskDefPath = path.isAbsolute(taskDefinitionFile)
      ? taskDefinitionFile
      : path.join(process.env.GITHUB_WORKSPACE, taskDefinitionFile);
    if (!fs.existsSync(taskDefPath)) {
      throw new Error(`Task definition file does not exist: ${taskDefinitionFile}`);
    }
    const taskDefContents = require(taskDefPath);

    // Insert the image URI
    if (!Array.isArray(taskDefContents.containerDefinitions)) {
      throw new Error("Invalid task definition format: containerDefinitions section is not present or is not an array");
    }
    const containerDef = taskDefContents.containerDefinitions.find(function (element) {
      return element.name == containerName;
    });
    if (!containerDef) {
      throw new Error("Invalid task definition: Could not find container definition with matching name");
    }

    const ssmSecrets = await recursiveGetParametersByPath(secretsWildcard);

    const aliasedSecrets = ssmSecrets.map((item) => {
      const name = item.Name;

      return {
        name: name.substring(name.lastIndexOf("/") + 1, name.length),
        valueFrom: item.ARN,
      };
    });

    containerDef.secrets = aliasedSecrets;

    // Write out a new task definition file
    var updatedTaskDefFile = tmp.fileSync({
      tmpdir: process.env.RUNNER_TEMP,
      prefix: "task-definition-",
      postfix: ".json",
      keep: true,
      discardDescriptor: true,
    });
    const newTaskDefContents = JSON.stringify(taskDefContents, null, 2);
    fs.writeFileSync(updatedTaskDefFile.name, newTaskDefContents);
    core.setOutput("task-definition", updatedTaskDefFile.name);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
  run();
}
