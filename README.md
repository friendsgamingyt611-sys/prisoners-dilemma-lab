# Iterated Prisoner's Dilemma Simulator

This project implements an Axelrod-style Iterated Prisoner's Dilemma tournament in C.

It includes:

- `analytical` mode for exact long-run expected values using a Markov-chain model
- `experimental` mode for Monte Carlo tournaments over many rounds and repetitions
- `sweep` mode for noise sensitivity analysis that is easy to graph from CSV
- a full graphical browser interface with live play, editable settings, and a live leaderboard

## Graphical Interface

Open [index.html](/home/devansh/Documents/Code%20projects_vscode/Prisoner's_Dilemma_Mod/index.html) in a browser for the interactive version.

If your browser blocks local script or font loading, run a tiny local server from this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

The graphical app lets you edit:

- rounds per match
- repetitions per pairing
- noise level
- animation speed
- random seed
- self-play on or off
- payoff values for `CC`, `CD`, `DC`, and `DD`
- which strategies enter the tournament

Payoff meaning:

- `CC`: both players cooperate
- `CD`: you cooperate and the opponent defects
- `DC`: you defect and the opponent cooperates
- `DD`: both players defect

It also shows:

- the current live match
- round-by-round action feed
- a live updating leaderboard
- a running performance trend chart

## Included strategies

- `AlwaysCooperate`
- `AlwaysDefect`
- `TitForTat`
- `GrimTrigger`
- `Pavlov`
- `Random50`
- `GenerousTitForTat`

## Build

```bash
gcc -std=c11 -Wall -Wextra -pedantic -O2 main.c -lm -o pd_sim
```

## Run

```bash
./pd_sim analytical 0.01
./pd_sim experimental 200 100 0.01 42
./pd_sim sweep
```

## Output files

- `analytical_results.csv`
- `experimental_results.csv`
- `noise_sweep.csv`

These CSV files can be opened in Python, Excel, LibreOffice Calc, R, or gnuplot to reproduce tournament tables and comparison graphs.

## Reference model

The structure follows the standard research framing of the Iterated Prisoner's Dilemma popularized by Robert Axelrod's tournaments and modernized by the open-source Axelrod-Python project:

- https://github.com/Axelrod-Python/Axelrod
- https://axelrod.readthedocs.io/
