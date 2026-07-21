# Reflections for Week 5 (July 6 - July 10)

- From last week's work identified two uncertainties in matching Yu's results with pyEPM: volatile sticking coefficient and dilution history.
- Used Yu's (2001) sticking coefficient model. Not certain that this is the latest model used, but at least this is something I can reference in literature.
- I was starting to hate how my website looked too much like it was AI slop. I aimed for a more minimalist design, with more white space for easier and a more pleasant to look web interface. Used a reference from SquareSpace and iterated with Claude Sonnet 5.
- I also employed a Claude agent to work on my CFD project workflow. Trained agent with the working framework (flow domain geometry -> python wrapper -> SANS executable "blackbox" -> output).
- Asked agent to develop a workflow so that I can setup the relevant case information through an input yaml file, and run a python script to prepare the case for a batch job run.
- Tested and works great. I went a step ahead and asked the agent to also develop a framework for running case matrices (i.e sensitivity analyses). Works neatly - I run a batch script with general sensitivity metadata data -> sets up the inidividual cases -> sets the batch job to submit slurm jobs in parallel.
