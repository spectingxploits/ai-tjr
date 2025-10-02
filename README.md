# AI_TJR

<p align="center">
  <img src="public/AI-TJR-LOGO.png" alt="Odyssey Logo" width="600"/>
</p>

<p align="center">
<a href="https://github.com/Javadyakuza/ai-tjr/blob/main/LICENSE">
  <img src="https://img.shields.io/github/license/Javadyakuza/ai-tjr.svg?style=plastic&cacheSeconds=1" alt="License"/>
</a>

  <a href="https://github.com/Javadyakuza/ai-tjr/blob/main/package.json">
    <img src="https://img.shields.io/github/package-json/v/Javadyakuza/ai-tjr?style=plastic" alt="Version"/>
  </a>
  <a href="https://github.com/Javadyakuza/ai-tjr/issues">
    <img src="https://img.shields.io/github/issues/Javadyakuza/ai-tjr?style=plastic" alt="Issues"/>
  </a>
  <a href="https://github.com/Javadyakuza/ai-tjr/pulls">
    <img src="https://img.shields.io/github/issues-pr/Javadyakuza/ai-tjr?style=plastic" alt="Pull Requests"/>
  </a>
  <a href="https://github.com/Javadyakuza/ai-tjr/stargazers">
    <img src="https://img.shields.io/github/stars/Javadyakuza/ai-tjr?style=plastic" alt="Stars"/>
  </a>
  <a href="https://github.com/Javadyakuza/ai-tjr/network/members">
    <img src="https://img.shields.io/github/forks/Javadyakuza/ai-tjr?style=plastic" alt="Forks"/>
  </a>
  <a href="https://github.com/Javadyakuza/ai-tjr/commits/main">
    <img src="https://img.shields.io/github/last-commit/Javadyakuza/ai-tjr?style=plastic" alt="Last Commit"/>
  </a>
</p>

First AI-driven, automated trading telegram bot on Aptos !

AI-TJR is the first AI-powered automated trading Telegram bot on **Aptos**, and the first project in the Aptos ecosystem to bring Aptos wallets inside a Telegram mini-app.

it also is a interface for interacting with your favorite dexes through a telegram bot which abstracts the dex complexities into couple of buttons !

users can monitor the history of the trades, positions and orders, get real time price of different dexes tokens, managing assets, opening perpetual and spot potions, and more !

### Never miss an opportunity again !

This Bot is the dream of traders, connects to your wallet (no private key needed), uses it AI to analyze and detect a trading setup from your favorite telegram financial channels and only gets a confirmation from you execute the trades. everything is automated !

## Supported DEXes

- Hyperion(Aptos)
- Kanalabs(Aptos)
- MerkleTrade(Aptos)

## Supported Chains

- Aptos

## Supported Wallets

- Petra Wallet

## Features

- Supports multiple exchanges
- Limit and Market orders
- Perpetual, Spot and swap trades
- Automated trading signal fetcher
- Seamless integration with Telegram
- Full trade submitting support(tp|sl|increase|reduce)
- Managing open positions and orders
- Monitor full history of orders and positions
- Real time price monitoring from different dexes

---

# AI Integration: The Universal Signal Parser

At its core, this project's uniqueness lies in its use of Google's Gemini model as an intelligent translation layer. We employ dynamic prompt engineering to instruct the
AI to function as an expert financial analyst, capable of discerning actionable trading signals from noisy, unstructured text within Telegram messages.

The prompt guides the model to identify and extract a precise set of parameters—asset, entry/exit points, stop-loss, take-profit, and trade direction—and structure this
data into a machine-readable GlobalSignal object. This is the critical step that transforms human conversation into a command for the trading gateway.

This AI-first approach makes our bot a universal adapter for trading signals. It bypasses the need for brittle, regex-based parsers that would require custom logic for
each signal format. Instead, our bot is instantly compatible with a vast array of signal sources, making it exceptionally scalable and robust.

# Technical Security

> No sensitive data is neither requested nor stored in the bot.

> No Transaction can be singed or submitted on behalf of the user without his consent. User will be prompted to sign the transactions with clear messages while considering speed and security.

> No unwanted or accidental data will be included in transactions. the trade parameters are totally editable before submitting the transaction.

> This bot requires integration with a trusted third party service to handle signal automation named [telefeed](https://t.me/tg_feedbot).

# Technical Specification

Core Technologies

- Framework: Next.js 15 (App Router) with React 19
- Language: TypeScript
- Blockchain: Aptos (@aptos-labs/ts-sdk)
- AI Engine: Google Gemini (@google/genai) for signal parsing and analysis.
- Backend-as-a-Service: Supabase for user data and session management.
- Telegram Integration: grammy for bot interaction and Mini App orchestration.
- Testing: Vitest for unit and integration testing.

Architectural Highlights

- Modular Connector Gateway: The system is built around a ConnectorGateway that abstracts trading logic. It utilizes distinct interfaces (PerpConnector, SwapConnector) to
  create a plug-and-play architecture. This allows for rapid integration of new decentralized exchanges with minimal code changes.

  - Current Perpetual Connectors: Kanalabs, MerkleTrade
  - Current Spot/Swap Connectors: Hyperion

- AI-Powered Signal Parsing: A core feature is the signalParser, which uses the Gemini AI model to interpret unstructured text from Telegram messages and convert it into a
  structured, actionable GlobalSignal object.

- Seamless User Workflow: The entire trading lifecycle is designed for convenience:

  1.  The bot listens to channel posts in real-time.
  2.  AI parses a signal and the ConnectorGateway prepares transactions for all compatible exchanges.
  3.  The user receives a direct message with simple "Sign" buttons, each opening a pre-configured Telegram Mini App.
  4.  The user signs the transaction in-app using their connected Aptos wallet (e.g., Petra), completing the trade.

- API and Middleware: Backend logic is handled by Next.js API Routes. Critical services like database access are managed through dedicated middleware, ensuring a clean
  separation of concerns.

# Extras

## Telegram bot commands

### `/connect_wallet`

This command is used to connect your wallet to the bot. It will prompt you to connect your Petra wallet and then store the wallet address and public key in the database.

### `/disconnect_wallet`

This command is used to disconnect your wallet from the bot. It will remove the wallet address and public key from the database.

### `/setup_automation`

This command is used to setup the signal automation for the bot.

> NOTE: This command will prompt you to connect your telegram account with the [telefeed](https://t.me/tg_feedbot) service. WE Highly recommend to create a new telegram account for signal automation. Also there was not even a single report of any kind of abuse of personal information or any other kind of threat for the telegram accounts while they used this service. but anyhow, DYOR.

### `/deactivate_automated_channel`

This command is used to deactivate the automated channel.

### `/get_open_orders`

This command is used to get the open orders for the user. It will return the open orders in a table format.

### `/get_open_positions`

This command is used to get the positions for the user. It will return the positions in a table format.

### `/get_trade_history`

This command is used to get the order history for the user. It will return the order history in a table format.

### `/get_price`

This command is used to get the price for the specified token. It will return the price in a table format.

### `/get_balance`

This command is used to get the balance for the specified token. It will return the balance in a table format.

### `/cancel_order`

This command is used to cancel an order.

### `/close_position`

This command is used to close a position.

### `/update_tp_sl`

This command is used to update the TP and SL for a position.

> Also all these commands are visually available via the following commands

### `/wallet`

Returns buttons with wallet options

### `/automation`

Returns buttons with automation options

### `/trade`

Returns buttons with trade options

### `/help`

Returns every commands with description
