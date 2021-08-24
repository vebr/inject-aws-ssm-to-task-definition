## Inject Amazon SSM wildcard to task definition Action for GitHub Actions

Inserts a Wildcard AWS SSM into a container definition in an Amazon ECS task definition JSON file, creating new task definition file.

**Table of Contents**

<!-- toc -->

- [Usage](#usage)
- [License Summary](#license-summary)
- [Security Disclosures](#security-disclosures)

<!-- tocstop -->

## Usage

To insert Wildcard AWS SMM `/app/dev` as the secrets for the `web` container in the task definition file, and then deploy the edited task definition file to ECS:

```yaml
    - name: Inject Secrets Amazon ECS task definition
      id: inject-secret-web-container
      uses: vebr/inject-aws-ssm-to-task-definition@v1
      with:
        task-definition: task-definition.json
        container-name: web
        secretsWildcard: '/app/dev'

    - name: Deploy to Amazon ECS service
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.inject-secret-web-container.outputs.task-definition }}
        service: my-service
        cluster: my-cluster
```

If your task definition file holds multiple containers in the `containerDefinitions`
section which require updated secrets, chain multiple executions of this action
together using the output value from the first action for the `task-definition`
input of the second:

```yaml
    - name: Render Amazon ECS task definition for first container
      id: inject-secret-web-container
      uses: vebr/inject-aws-ssm-to-task-definition@v1
      with:
        task-definition: task-definition.json
        container-name: web
        secretsWildcard: '/app/dev'

    - name: Modify Amazon ECS task definition with second container
      id: inject-secret-app-container
      uses: vebr/inject-aws-ssm-to-task-definition@v1
      with:
        task-definition: ${{ steps.inject-secret-web-container.outputs.task-definition }}
        container-name: app
        secretsWildcard: '/app/db'

    - name: Deploy to Amazon ECS service
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.inject-secret-app-container.outputs.task-definition }}
        service: my-service
        cluster: my-cluster
```

See [action.yml](action.yml) for the full documentation for this action's inputs and outputs.

## License Summary

This code is made available under the MIT license.

## Security Disclosures

If you would like to report a potential security issue in this project, please create a GitHub issue.