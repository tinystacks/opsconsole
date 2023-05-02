# Introduction

Ops Console is an open-source console for cloud operations that delivers a dashboard and workflow engine so developers can organize resources in sensible ways, view key service metadata in one place and automate cloud workflows. With a low-code, widget-based approach, developers can design custom dashboards and workflows and even build their own custom widgets.

The platform comes with default plugins that offer a variety of features such as widgets for AWS ECS services and deployments, IAM JSON Policy viewers, and an AWS CLI, among others. The widgets are interactive and can exchange information, which enables the creation of dynamic and robust dashboards. With a provider and plugin model, developers can customize and extend the Ops Console as much as they wish. The samples/ folder includes several samples of dashboards that can be configured via YAML. 

# Use Cases
With the Ops Console, engineering and DevOps teams can: 

✅ Organize cloud resources with a single pane of glass<br/>
✅ Build deep operational health dashboards<br/>
✅ Share and run operational scripts via the CLI plugin<br/>
✅ Manage cloud sprawl and automate resolution for underutilized resources

# 📍 Roadmap
- [x] CLI widget to save and run scripts
- [x] Executable actions within widgets (ex. kill task for AWS ECS)
- [x] `opsconsole deploy` for a hosted dashboard
- [x] Cost control: underutilized resources widget
- [ ] Additional provider integrations (GitHub, Google Cloud, Azure, Snowflake, Cloudflare)
- [ ] Edit ECS Environment variables
- [ ] CI/CD widget
- [ ] Granular permissions

# Getting started
Follow installation instructions below to get the CLI installed. 

### Installation
```bash
# Install CLI
npm i -g @tinystacks/opsconsole;

# Make sure you have Docker installed and ports 3000 and 8000 open.
```
### Run sample dashboard 
#### AWS

This package includes other sample dashboard as well. As an example, it includes a sample dashboard that has ECS and AWS account info. To use that, follow these steps:

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

## Local Installation
```bash
# Clone this package
git clone https://github.com/tinystacks/opsconsole.git;

# Install dependencies and build
npm i; npm run build;

# Install the CLI globally
# Using the -g option installs the ops cli to your shell scope instead of the package scope. 
#  It adds the CLI command to bin, allowing you to call opsconsole from anywhere
npm i -g;

# Use the CLI, refer to the usage guide below
opsconsole -v;
```
# Deployment
Deploy a hosted version of the TinyStacks Ops Console in minutes. 

```
# Routes to signup UI to obtain an auth token
opsconsole signup; 

opsconsole configure
# paste your token here

# deploy your Ops Console to the TinyStacks cloud!
opsconsole deploy -c DASHBOARD-NAME.yaml
```

That's it! Deployments take a few minutes. 

* Please note that when deploying a hosted version of the Ops Console, local AWS profiles in the AWS provider will not work. Instead, an access/secret key pair needs to be used.

# Usage

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

## Sample dashboards
Sample dashboard configurations can be found in the `/samples` folder in this repository. 

## Customizing Dashboards
### Using widgets
1. Define the widget in the `widgets` section of YAML
2. Reference the widget in a dashboard
3. Add the widget's source to the `dependencies` section of the YAML in the format `widget name: 'dependency package'`

### Using providers
Providers provide data to widgets from an external source.
1. Define the provider in the `providers` section
2. Reference the provider as a list item in widget.

### Sharing data between widgets
Any property in a widget’s YAML can be substituted for either the props or data of another widget. 

|Parameter|Required|Syntax|Example|
|---------|---------|---------|---------|
|Reference|Yes|$ref: [widget path]|$ref: '#/Console/widgets/EcsInfo'
|Path|No|path: [path of data or props of the widget]|path: region

## Concepts
|Name|Description|
|---------|---------|
|Console|A console is a top level construct. It includes a name to identify itself, as well as dashboards, widgets, providers and dependencies. 
|Dashboard|A dashboard is a page that consists of an id, a route, and list of widget references. 
|Widget|Widgets are components that have two functions: render and getData. getData is called in the API’s server and is used to make external requests, do computations, etc. Once it is called, it sets some data on the widget itself that’s passed back to the frontend, where render is called to display the widget.
|Providers|Providers are data sources for widgets. They are only executed server side and can be used to offload complex logic from a widget's `getData` function.  Providers can also be used across multiple widgets and are therefore better suited for any processes that involve caching, credentials management, or fetching data required by multiple widgets. Provider definitions are also currently read-only from the perspective of the API, so any additional data attached to a provider during runtime will not leak back into the yaml on save whereas a widget requires explicit filtering of class properties via its `toJson` function to prevent properties from being persisted to the yaml.


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

### [Core widgets](https://github.com/tinystacks/ops-core-widgets)
|Name|Description|
|---------|---------|
|[Panel](https://github.com/tinystacks/ops-core-widgets#panel)|This widget renders multiple internal widgets in a single direction, either vertical or horizontal.
|[Tabs](https://github.com/tinystacks/ops-core-widgets#tabs)|This widget renders multiple internal widgets in a tab view. Combine with panel or grid to make robust views.
|[Grid](https://github.com/tinystacks/ops-core-widgets#grid)|This widget renders multiple internal widgets in a grid.
|[Markdown](https://github.com/tinystacks/ops-core-widgets#markdown)|This widget renders markdown.
|[CLI](https://github.com/tinystacks/ops-core-widgets#cli)|This widget runs a bash command. The command may be multiple commands separated by ';'. You can also reference scripts that exist in the same directory as your config. (currently, only supported locally)

### [AWS widgets](https://github.com/tinystacks/ops-aws-core-plugins)
|Name|Description|
|---------|---------|
|[CloudWatch Logs](https://github.com/tinystacks/ops-aws-core-plugins#cloudwatch-logs)|Renders a widget containing logs from a CloudWatchLogs log group or log stream.
|[CloudWatch Graph](https://github.com/tinystacks/ops-aws-core-widgets#cloudwatch-metric-graph)|Renders a widget containing graphs populated by one or many CloudWatch metrics.
|[ECS Info](https://github.com/tinystacks/ops-aws-core-widgets#ecs-info)|Renders a widget containing information about an ECS Service.
|[ECS Deployments](https://github.com/tinystacks/ops-aws-core-widgets#ecs-deployments)|Renders a widget containing information about an ECS Service's current deployments.


# Contributions
See CONTRIBUTING.md.
