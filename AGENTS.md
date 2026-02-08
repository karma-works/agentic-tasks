Do the deployment within the project.
Prefer project scoped `.opencode` directory for debugging and testing.
Only read ~/.config/opencode if absolutely necessary and / or if the user gives you explicit permission. Never ask the user for write access, don't copy or move something by yourself there.
For installation to the user directory, exclusively use `install.sh`. 