---
layout: post
title: "Launching the IFRS 16 Lease Engine: Free Lease Accounting Workings in Your Browser"
description: "Our new free tool turns a lease contract into a complete IFRS 16 working â€” ROU asset, lease liability, amortisation schedules, journal vouchers and an audit note â€” with support for co-leases and subleases."
date: 2026-07-10
category: "IFRS 16"
author: "Prompt Consulting Editorial Team"
image: "/blog/assets/images/ifrs16-lease-engine.svg"
imageAlt: "Office tower beside a declining lease liability schedule and journal entries"
tags:
  - posts
permalink: "/blog/ifrs16-lease-engine/"
---

Every accountant who has adopted IFRS 16 knows the drill: pull the rent, service charges and escalations out of a 30-page lease contract, build a present-value model in a spreadsheet, tie the schedules back together after every tweak, and then draft journal entries and a note the auditor will accept. It is careful, repetitive work â€” and it is exactly the kind of work software should carry.

Today we are launching the **[IFRS 16 Lease Engine](/ifrs16/)**, a free calculator that produces a complete lease working in minutes, right in your browser.

## What it produces

Enter the lease terms â€” or upload the contract PDF and let the AI extraction pre-fill them for your review â€” and the engine generates:

- **Initial measurement** â€” the lease liability at present value and the right-of-use asset, including initial direct costs, incentives, restoration provisions and discounted security deposits.
- **Full amortisation schedules** â€” effective-interest run-off of the liability and straight-line depreciation of the ROU asset, period by period, exportable to CSV.
- **A complete journal voucher pack** â€” initial recognition through every periodic entry (interest, depreciation, payments with recoverable input VAT, variable charges), formatted for import into Xero, Zoho, Tally or QuickBooks.
- **Disclosure figures** â€” the IFRS 16.58 maturity analysis and the amounts recognised in profit or loss.
- **An audit note** â€” a structured memorandum covering the basis of measurement and key judgements, ready to print or export.

## Built the way an auditor thinks

Three design decisions matter more than any feature list:

1. **Every number is deterministic.** The AI reads contracts and drafts narrative â€” it never performs a calculation. The same confirmed inputs always produce the same schedules.
2. **Nothing is computed without your sign-off.** Extracted figures land on a review screen with clause references, and uncertain readings are flagged. You confirm or correct before the engine runs.
3. **The rule-book reflects practice in the UAE.** Lease payments are measured excluding VAT throughout; fixed service charges are capitalised with the rent (non-lease components not separated); variable charges go to profit or loss; rent-free periods, fixed escalations, Ejari and broker costs, restoration obligations and short-term or low-value exemptions are all handled.

## Shared premises, handled properly

Real leases are rarely tidy, so the engine supports three arrangements out of the box:

- **Standalone** â€” one lessee, one working.
- **Co-lease** â€” each co-lessee's share is accounted for as its own lease, with a working per component plus a consolidated working and a reconciliation between them.
- **Sublease** â€” the head lease continues as lessee accounting while the sublease is classified by reference to the right-of-use asset. A finance sublease derecognises the sublet portion and recognises a net investment in the sublease with its own run-off schedule; an operating sublease straight-lines the income.

## Try it now

The engine is live at **[promptconsulting.co.in/ifrs16](/ifrs16/)** â€” free to use, with a built-in demo lease if you want to see a full working before entering your own numbers.

A calculator supports professional judgement; it does not replace it. Discount-rate selection, reasonably-certain assessments on options, and materiality calls remain yours â€” and if your lease portfolio is complex enough that they are keeping you up at night, [talk to us](mailto:info@promptconsulting.co.in).
