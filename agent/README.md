ModuleAB Agent
=====

Build
----

```bash
mkdir -p project/src
cd project/src
git clone --recursive https://github.com/ProjectModuleAngelaBaby/ProjectModuleAB_Server moduleab_server
git clone --recursive https://github.com/ProjectModuleAngelaBaby/ProjectModuleAB_Agent moduleab_agent
cd moduleab_agent
go get -v
make  # you will get 'moduleab_agent.tar.gz'
```

Configuration
-----

```ini
server=http://localhost:7001
# you need to set this with the conf on server.
loginkey=guess?
# loglevel might be
# debug, info, warn, error, fatal
loglevel=debug
uploadthreads=5
pidfile=moduleab.pid
# if you have a machine has memory < 1G, try set this true.
lowmemorymode=true
```
