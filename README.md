# Introduction

Ops Console is an open-source console for cloud operations that delivers a dashboard and workflow engine so developers can organize resources in sensible ways, view key service metadata in one place and automate cloud workflows. With a low-code, widget-based approach, developers can design custom dashboards and workflows and even build their own custom widgets.

With the Ops Console, engineering and DevOps teams can: 

✅ Organize cloud resources with a single pane of glass<br/>
✅ Build deep operational health dashboards<br/>
✅ Share and run operational scripts via the CLI plugin<br/>
✅ Manage cloud sprawl and automate resolution for underutilized resources

Visit [docs.tinystacks.com](https://docs.tinystacks.com) for our full set of documentation. 

The platform comes with default plugins that offer a variety of features such as widgets for AWS ECS services and deployments, IAM JSON Policy viewers, and an AWS CLI, among others. The widgets are interactive and can exchange information, which enables the creation of dynamic and robust dashboards. With a provider and plugin model, developers can customize and extend the Ops Console as much as they wish. The [samples/](https://github.com/tinystacks/opsconsole/tree/main/samples) folder includes several samples of dashboards that can be configured via YAML.

### What problems is the Ops Console intended to serve? 

1. Cloud sprawl is real - modern cloud applications are built with hundreds of cloud services and resources. It's tough to manage the sprawl. 
2. Viewing and organizing cloud resources (to your preference) is difficult especially when debugging or monitoring deployments.
3. The daily workflows of engineers involve guessing through tens of screens and clicks to find information. There's no way to save these steps or build repeatable workflows.
4. Inability for developers to centralize and evaluate cloud configurations alongside observability tools.

### Why does cloud sprawl matter? 

Our founders spent six years at AWS and witnessed thousands of customer issues that frankly shouldn't exist. 

1. Unable to find a resource because they were looking at the wrong region. 
2. Debugging a critical issue and facing difficulty reconciling info across observability tools and tens of service consoles. 
3. Navigating through endless screens and clicks just to find out which version of the container image is currently deployed. 
4. Inability to clean up resources or drive down costs for fear of impacting production services or developer workflow.

### What can customers do with the Ops Console?

Developers can connect their cloud accounts and organize resources in sensible ways providing immediate cloud comprehensibility. Developers can then build dashboards with common widgets for deployments, environment variables, logs, alarms and even write their own. Teams can share and run operational scripts via the CLI widget embedded directly in the relavent dashboards. 

## Roadmap
- [x] CLI widget to save and run scripts
- [x] Executable actions within widgets (ex. kill task for AWS ECS)
- [x] Hosted dashboards via `opsconsole deploy` 
- [x] Cost dashboard: reduce cloud spend with 1-click delete, scale down or optimize workflows
- [ ] SSO credentials support
- [ ] Additonal Providers
    * [ ] GitHub
    * [ ] Google Cloud
    * [ ] Cloudflare
    * [ ] MongoDB
- [ ] Additional Widgets
    * [ ] CI/CD 
    * [ ] Database Info
    * [ ] CDN Info
    * [ ] Edit Environment Variables
- [ ] Groups support and granular permissions
- [ ] Integrations
    * [ ] Backstage 
    * [ ] Grafana

## Getting started
Follow installation instructions below to get the CLI installed.

### Installation
```bash
# Install CLI
npm i -g @tinystacks/opsconsole;

# Make sure you have Docker installed and ports 3000 and 8000 open.
```
### Run a sample dashboard 
#### AWS

The [opsconsole repository](https://github.com/tinystacks/opsconsole/tree/main/samples) includes multiple sample dashboards. As an example, it includes a sample dashboard that has ECS and AWS account info. To use that, follow these steps:

```
curl https://raw.githubusercontent.com/tinystacks/opsconsole/main/samples/ecs-dashboard-sample.yml -o ecs-dashboard-sample.yml

# Modify line 6 by changing [your AWS profile] to your local AWS profile name
# Modify lines [22-24] by changing the region, ecs clustername, and ecs service names to match resources in your account

opsconsole up -c ecs-dashboard-sample.yml
```
#### Basic
For a very basic dashboard that contains all the default layout elements, simply run:
```
opsconsole init;
opsconsole up;
```

# Installation

## Pre-requisites
To use the default installation, you need to have [docker installed](https://docs.docker.com/get-docker/).

**Windows users** must have Docker Desktop running.

Also please make sure that ports 8000 and 3000 are open, as those ports are used by the [API](https://github.com/tinystacks/ops-api) and [frontend](https://github.com/tinystacks/ops-frontend). If these ports are reserved, you can pull down the docker images for each of these packages and change the docker run to map ports separately.

## Install from the Global NPM registry
```bash
# Install from the public npm registry
npm i -g @tinystacks/opsconsole;

# Use the CLI, refer to the usage guide below
opsconsole -v;

```

## Hosted Deployment
Deploy a hosted version of the TinyStacks Ops Console in minutes. 

```
# Routes to signup UI to obtain an auth token
opsconsole signup; 

opsconsole configure
# paste your token here

# Ensure you have set an access and secret key for AWS credentials
# deploy your Ops Console to the TinyStacks cloud!
opsconsole deploy -c DASHBOARD-NAME.yaml
```

That's it! Deployments take a few minutes. 

:warning: When deploying a hosted version of the Ops Console, an access/secret key pair must be used. Local credentials are not saved by the Ops Console and will not work in a hosted version of Ops Console. 

# Dashboards
### Concepts
#### Console
A console is a top level construct. It includes a name to identify itself, as well as dashboards, widgets, providers and dependencies. 
#### Dashboard
A dashboard is a page that consists of an id, a route and list of widget references. 
#### Widgets
Widgets are components that have two functions: render and getData. getData is called in the API’s server and is used to make external requests, do computations, etc. Once it is called, it sets some data on the widget itself that’s passed back to the frontend, where render is called to display the widget.
#### Providers
Providers provide data to widgets. They are backend-only code and can interact with the filesystem, keep data around, or do other more traditionally backend tasks. They can be long running and run in the background. They may be passed to widgets to provide sensitive information or long-lived information, whereas widgets are better written as quick request/response styled objects. 

#### Constants
Constants are static values that can be shared across dashboards.
#### Parameters
Parameters are dynamic values at the dashboard level that can be override with URL parameters.

### Sample Dashboards
#### Basic Layout [:link:](https://github.com/tinystacks/opsconsole/blob/main/samples/layout-sample.yml)
Basic layout dashboard showcasing different widgets.
```
curl https://raw.githubusercontent.com/tinystacks/opsconsole/main/samples/layout-sample.yml -o ecs-dashboard-sample.yml

opsconsole up -c ecs-dashboard-sample.yml
```

#### AWS Dashboard [:link:](https://github.com/tinystacks/opsconsole/blob/main/samples/aws-sample.yml)
Basic AWS dashboard featuring metrics, logs and CLI widgets.
```
curl https://raw.githubusercontent.com/tinystacks/opsconsole/main/samples/aws-sample.yml -o aws-sample.yml

# Modify line 6 by changing [your AWS profile] to your local AWS profile name
opsconsole up -c aws-sample.yml
```

#### ECS Dashboard [:link:](https://github.com/tinystacks/opsconsole/blob/main/samples/ecs-dashboard-sample.yml)
Pre-built dashboard for ECS clusters featuring ECS info, tasks, metrics, logs and CLI widgets. 
```
curl https://raw.githubusercontent.com/tinystacks/opsconsole/main/samples/ecs-dashboard-sample.yml -o ecs-dashboard-sample.yml

# Modify line 6 by changing [your AWS profile] to your local AWS profile name
# Modify lines [22-24] by changing the region, ecs clustername, and ecs service names to match resources in your account
opsconsole up -c ecs-dashboard-sample.yml
```

#### SQS Dashboard [:link:](https://github.com/tinystacks/opsconsole/blob/main/samples/sqs-sample.yml)
Pre-built dashboard for SQS queues featuring SQS info, metrics and CLI widgets. 
```
curl https://raw.githubusercontent.com/tinystacks/opsconsole/main/samples/sqs-sample.yml -o sqs-sample.yml

# Modify lines [6-12] by changing the region, queue names and  AWS profile to match to your account
opsconsole up -c sqs-sample.yml
```

### Core widgets [:link:](https://github.com/tinystacks/ops-core-widgets)
|Name|Description|
|---------|---------|
|[Panel](https://github.com/tinystacks/ops-core-widgets#panel)|This widget renders multiple internal widgets in a single direction, either vertical or horizontal.
|[Tabs](https://github.com/tinystacks/ops-core-widgets#tabs)|This widget renders multiple internal widgets in a tab view. Combine with panel or grid to make robust views.
|[Grid](https://github.com/tinystacks/ops-core-widgets#grid)|This widget renders multiple internal widgets in a grid.
|[Markdown](https://github.com/tinystacks/ops-core-widgets#markdown)|This widget renders markdown.
|[CLI](https://github.com/tinystacks/ops-core-widgets#cli)|This widget runs a bash command. The command may be multiple commands separated by ';'. You can also reference scripts that exist in the same directory as your config. (currently, only supported locally)

### AWS widgets [:link:](https://github.com/tinystacks/ops-aws-core-plugins)
|Name|Description|
|---------|---------|
|[CloudWatch Logs](https://github.com/tinystacks/ops-aws-core-plugins#cloudwatch-logs)|Renders a widget containing logs from a CloudWatchLogs log group or log stream.
|[CloudWatch Graph](https://github.com/tinystacks/ops-aws-core-widgets#cloudwatch-metric-graph)|Renders a widget containing graphs populated by one or many CloudWatch metrics.
|[ECS Info](https://github.com/tinystacks/ops-aws-core-widgets#ecs-info)|Renders a widget containing information about an ECS Service.
|[ECS Deployments](https://github.com/tinystacks/ops-aws-core-widgets#ecs-deployments)|Renders a widget containing information about an ECS Service's current deployments.

### Constants
Constants are defined at the console level and can be shared across dashboards. To reference a constant, use the name of the constant prefixed with `$const.`. ex. `$const.const1`.

Example for defining constants:
```
Console:
  name: console
  constants:
    const1:
      type: string
      value: 'text'
    const2: 
      value: true
      type: boolean
    const3:
      value: 123456
      type: number
    const4:
      value: '2022-04-27'
      type: date
```

### Parameters
Parameters are dynamic values at the dashboard level that can be override with URL parameters. To reference a parameter, use the name of the parameter prefixed with `$param.` ex. `$param.text`.

Example for defining parameters:
```
dashboards:
    LayoutDashboard:
      parameters:
        - name: text
          default: test 123
        - name: num
          type: number
          default: 42
        - name: bool
          type: boolean
        - name: date
          type: date
```

### Providers
Currently supports AWS with plans to add others! AWS provider can be configured with local profiles or Access/Secret keys.  
#### AWS

```
providers:
  AwsLocalProvider:
    id: AwsLocalProvider
    type: AwsCredentialsProvider
    credentials:
      # Option A: local credentials
      profileName: default 
      # Option B: Access/Secret keys (required when deploying with opsconsole deploy)
      # AwsAccessKeyId:
      # AwsSecretAccessKey: 
```

#### Enabling Providers in CLI 
To enable Provider usage in the CLI widget, the Provider must implement [CliEnvironmentProvider](https://github.com/tinystacks/ops-core-widgets/blob/main/src/cli-environment-provider.ts).
### Customizing Dashboards
For reference, see one of the samples in the [opsconsole repository](https://github.com/tinystacks/opsconsole/tree/main/samples).

#### Using widgets
1. Define the widget in the `widgets` section of YAML
2. Reference the widget in a dashboard
3. Add the widget's source to the `dependencies` section of the YAML in the format `widget name: 'dependency package'`

#### Using providers
Providers provide data to widgets. They are backend-only code and can interact with the filesystem, keep data around, and do other more traditionally backend tasks. They are also the best way to provide credentials so that they don't leak through to the client.

1. Define the provider in the `providers` section
2. Reference the provider as a list item in a widget.

See the [AWS sample](https://github.com/tinystacks/opsconsole/blob/main/samples/aws-sample.yml#L4) for reference.

#### Sharing data between widgets
Any property in a widget’s YAML can be substituted for either the props or data of another widget. 

|Parameter|Required|Syntax|Example|
|---------|---------|---------|---------|
|Reference|Yes|$ref: [widget path]|$ref: '#/Console/widgets/EcsInfo'
|Path|No|path: [path of data or props of the widget]|path: region

# Reference
## CLI Commands
#### opsconsole
Shows usage and help information

#### opsconsole init
Creates a sample template file for a basic, layout only Ops Console.

#### opsconsole up
Starts the ops console by pulling down the docker images for the ops api (public.ecr.aws/tinystacks/ops-api) and frontend (public.ecr.aws/tinystacks/ops-frontend) and rebuilding them using dependencies included in your yaml file. This may take several minutes depending on your system's available resources. It creates a docker networking bridge called ops-console through which the containers communicate with each other.
Specify the ops console you want to use with the -c flag. 

#### opsconsole deploy
Deploys ops console on a TinyStacks hosted solution. Requires a free account and an API key.
Specify the ops console you want to use with the -c flag. 

#### opsconsole configure
Prompts for configuration information including an API token that will be used for deploying your console as a hosted solution. Not necessary for running locally via the "up" command.

#### opsconsole signup
Open signup portal to creating/managing account and API tokens. Not necessary for running locally via the "up" command.

#### opsconsole list
List the details of your existing hosted consoles. Requires an account and an API key.

#### opsconsole update
Updates the Ops Console CLI to the latest version

#### Options
|Flag|Arguments|Description|
|----|---------|-----------|
|-a, --arch|\<arch\>|  Specifies the architecture. Defaults to 'x86'. Options: 'x86', 'arm'
|-c, --config-file|\<config-file\>|  Specifies a config file. See the `samples` folder in this repo for sample config files. Looks for config.yml in the current working directory by default.
|-V, --verbose||  Displays additional logs.
|-b, --backend-port|\<backend-port\>| Specifies the port to be exposed by the backend service. Defaults to port 8000.
|-f, --frontend-port|\<frontend-port\>| Specifies the port to be exposed by the frontend service. Defaults to port 3000.
|-h, --help|| display help for this command

## API Reference
To view the API reference for the backend server that backs the Ops Console, see [API Reference](https://docs.tinystacks.com/api/).

# Contributions
See CONTRIBUTING.md.
