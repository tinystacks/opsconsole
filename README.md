# Introduction

Ops Console is an open-source developer portal that delivers a dashboard with an inline CLI notebook so that application teams can more reliably and efficiently manage cloud infrastructure. With a low-code, widget-based approach, developers can design custom dashboards and workflows on a project basis and even build their own custom widgets.

The platform comes with default plugins that offer a variety of features such as widgets for AWS ECS services and deployments, IAM JSON Policy viewers, and an AWS CLI, among others. The widgets are interactive and can exchange information, which enables the creation of dynamic and robust dashboards. With a provider and plugin model, developers can customize and extend the Ops Console as much as they wish. The samples/ folder includes several samples of dashboards that can be configured via YAML. 

# Use Cases
The OpsConsole is a personalized portal that can be used for many cloud developer workflows. Some of the use cases we've considered are:

1. Building deep operational health dashboards
2. Easily navigating through cloud resources for your application
3. Sharing and running operational scripts via the CLI plugin 
4. Managing cloud sprawl and automating resolution for underutilized resources

# Getting started
Follow installation instructions below to get the CLI installed. For a very basic dashboard that contains all the default layout elements, simply run
```
ops-cli init;
ops-cli up;
```

This package includes other sample dashboard as well. As an example, it includes a sample dashboard that has ECS and AWS account info. To use that, follow these steps:

```
ops-cli init --template ecs-dashboard;

# Modify line 6 by changing [your AWS profile] to your local AWS profile name
# Modify lines [22-24] by changing the region, ecs clustername, and ecs service names to match resources in your account

ops-cli up;
```

# Installation

## Pre-requisites
To use the default installation, you need to have [docker installed](https://docs.docker.com/get-docker/).

Also please make sure that ports 8000 and 3000 are open, as those ports are used by the [API](https://github.com/tinystacks/ops-api) and [frontend](https://github.com/tinystacks/ops-frontend). If these ports are reserved, you can pull down the docker images for each of these packages and change the docker run to map ports separately.

## Install from the Global NPM registry
```bash
# Install from the public npm registry
npm i -g @tinystacks/ops-cli;

# ---- prereqs section about docker and ports

# Use the CLI, refer to the usage guide below
ops-cli -v;

```

## Run sample dashboard
-- edit YAML and add ecs cluster name (for example)

## Local Installation
```bash
# Clone this package
git clone https://github.com/tinystacks/ops-cli.git;

# Install dependencies and build
npm i; npm run build;

# Install the CLI globally
# Using the -g option installs the ops cli to your shell scope instead of the package scope. 
#  It adds the CLI command to bin, allowing you to call ops-cli from anywhere
npm i -g;

# Use the CLI, refer to the usage guide below
ops-cli -v;
```

# Usage

## CLI Commands
### ops-cli
Shows usage and help information

### ops-cli init
Creates a sample config file that includes a basic template. If you don't 

### ops-cli up
Starts the ops console by pulling down the docker images for the ops api (public.ecr.aws/tinystacks/ops-api) and frontend (public.ecr.aws/tinystacks/ops-frontend). It creates a docker networking bridge called ops-console through which the containers communicate with each other.

#### Options
|Flag|Arguments|Description|
|----|---------|-----------|
|-a, --arch|\<arch\>|  Specifies the architecture. Defaults to 'x86'. Options: 'x86', 'arm'
|-c, --config-file|\<config-file\>|  Specifies a config file. See the `samples` folder in this repo for sample config files.
|-h, --help||             display help for this command

## Sample configs
Sample dashboard configurations can be found in the `/samples` folder in this repository. 

## Concepts
|Name|Description|
|---------|---------|
|Console|A console is a top level construct. It includes a name to identify itself, as well as dashboards, widgets, providers and dependencies. 
|Dashboard|A dashboard is a page that consists of an id, a route and list of widget references. 
|Widget|Widgets are components that have two functions: render and getData. getData is called in the API’s server and is used to make external requests, do computations, etc. Once it is called, it sets some data on the widget itself that’s passed back to the frontend, where render is called to display the widget.
|Providers|Providers are the beating hearts of the Console. They can be long running and run in the background. They may be passed to widgets to provide sensitive information or long-lived information, whereas widgets are better written as quick request/response styled objects. 

## List of widgets
|Name|Description|
|---------|---------|
|Panel|This widget renders multiple internal widgets in a single direction, either vertical or horizontal.
|Tabs|This widget renders multiple internal widgets in a tab view. Combine with panel or grid to make robust views.
|Grid|This widget renders multiple internal widgets in a grid.
|Markdown|This widget renders markdown.

### [AWS widgets](https://github.com/tinystacks/ops-aws-core-plugins)
|Name|Description|
|---------|---------|
|[CloudWatch Logs](https://github.com/tinystacks/ops-aws-core-plugins#cloudwatch-logs)|Renders a widget containing logs from a CloudWatchLogs log group or log stream.
|[CloudWatch Graph](https://github.com/tinystacks/ops-aws-core-widgets#cloudwatch-metric-graph)|Renders a widget containing graphs populated by one or many CloudWatch metrics.
|[ECS Info](https://github.com/tinystacks/ops-aws-core-widgets#ecs-info)|Renders a widget containing information about an ECS Service.
|[ECS Deployments](https://github.com/tinystacks/ops-aws-core-widgets#ecs-deployments)|Renders a widget containing information about an ECS Service's current deployments.

## Build and customizing dashboards
### Using widgets
1. Define the widget in the `widgets` section of YAML
2. Reference the widget in a dashboard
3. Add the widget's source to the `dependencies` section of the YAML

### Using providers
Providers provide data to widgets from an external provider.
1. Define the provider in the `providers` section
2. Reference the provider as a list item in widget.

### Sharing data between widgets
Any property in a widget’s YAML can be substituted for either the props or data of another widget. 
|Parameter|Required|Syntax|Example
|---------|---------|---------|---------|
|Reference|Yes|$ref: [widget path]|$ref: '#/Console/widgets/EcsInfo'
|Path|No|path: [path of data or props of the widget]|path: region


# Contributions
See CONTRIBUTING.md.
