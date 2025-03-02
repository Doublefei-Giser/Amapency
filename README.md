# 地百通（Amapency）

## 项目简介

Amapency 是一个基于 Vue 3 和 TypeScript 的项目，使用 Vite 作为构建工具。该项目的主要功能是通过点击地图上的 POI（Point of Interest）点，然后传入智能体进行对话获取该 POI 的百科信息，并且可以与大模型进行进一步对话。

![demo](https://github.com/user-attachments/assets/4356cc38-6ee4-4486-859d-39001c9ae178)

## 技术栈
- Vue 3 Typescript Vite

## 环境变量

项目使用 `.env` 文件来管理 API 密钥等敏感信息，目前还没有部署，如需要套用尝试请根据 `.env.example` 文件创建自己的 `.env` 文件。另外，想体验智能体效果的话， [点击直达](https://mbd.baidu.com/ma/s/19yHlf8H)欢迎各位来体验，并提issue。

## 功能描述
之前接入的是coze 的智能体但是已经没有额度了，所以只能暂且使用文心一言的智能体，过段时间上线一下deepseek版本的。
目前重构的是手机端，还有很多地方没有完善，后续会陆续开发更多功能。
