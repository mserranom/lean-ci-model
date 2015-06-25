///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>

import Immutable = require('immutable');

export module model {

    export interface BuildRequest {
        id : string,
        repo : string;
        commit : string;
        pingURL : string;
    }

    export interface BuildConfig {
        command : string;
        dependencies : Array<string>;
    }

    export interface BuildResult {
        request : BuildRequest;
        succeeded : boolean;
        buildConfig : BuildConfig;
        log : string;
    }

    export interface ProjectDependency {
        upstream : Project;
        downstream : Project;
    }

    export class Project {
        repo : string;
        upstreamDependencies : Immutable.Set<ProjectDependency> = Immutable.Set<ProjectDependency>();
        downstreamDependencies : Immutable.Set<ProjectDependency> = Immutable.Set<ProjectDependency>();

        constructor(repo : string) {
            this.repo = repo;
        }

        toJSONObject() {
            let result : any =  {repo : this.repo};
            result.upstreamDependencies = [];
            result.downstreamDependencies = [];
            this.upstreamDependencies.forEach(dep => result.upstreamDependencies.push(dep.upstream.repo));
            this.downstreamDependencies.forEach(dep => result.downstreamDependencies.push(dep.downstream.repo));
            return result;
        }
    }

    export class BuildQueue {

        private _queue : Array<BuildRequest> = [];

        private _finished : Array<BuildRequest> = [];

        private _activeBuilds : Immutable.Set<BuildRequest> = Immutable.Set<BuildRequest>();

        /** adds a project to the queue */
        add(repo : BuildRequest) {
            this._queue.push(repo);
        }

        /** moves a project to active builds and returns the activated project */
        next() : BuildRequest {
           if(this.queueIsEmpty() || this.maxConcurrentBuildsReached()){
               return null;
           }
           for(let i = 0; i < this._queue.length; i++) {
               let nextRequest = this._queue[i];
               if(!this.isActive(nextRequest.repo)) {
                   this._activeBuilds = this._activeBuilds.add(nextRequest);
                   this._queue.splice(i, 1);
                   return nextRequest;
               }
           }
           return null;
        }

        /** finishes an active build, removing it from the set of active builds */
        finish(repo : BuildRequest) {
            this._activeBuilds = this._activeBuilds.delete(repo);
            this._finished.push(repo);
        }

        /** project builds that are active at the moment */
        activeBuilds() : Immutable.Set<BuildRequest> {
            return this._activeBuilds;
        }

        queue() : Array<BuildRequest> {
            return this._queue;
        }

        finished() : Array<BuildRequest> {
            return this._finished;
        }

        private isActive(repo:string) : boolean {
            return this._activeBuilds.some(activeBuild => activeBuild.repo == repo);
        }

        private maxConcurrentBuildsReached() : boolean {
            return this._activeBuilds.count() >= 1;
        }

        private queueIsEmpty() : boolean {
             return this._queue.length <= 0
        }

    }

    export class AllProjects {

        private _projects : Immutable.Map<string, Project> = Immutable.Map<string, Project>();

        populateTestData() {
            this.addNewProject('mserranom/lean-ci-testA');
            this.addNewProject('mserranom/lean-ci-testB');
            this.addNewProject('mserranom/lean-ci');
        }

        getProjects() : Array<Project> {
            let projects : Array<Project> = [];
            this._projects.forEach((project,repo) => projects.push(project));
            return projects;
        }

        getProject(repo : string) : Project {
            return this._projects.get(repo);
        }

        addNewProject(repo : string) {
            let project = new Project(repo);
            this._projects = this._projects.set(repo, project);
        }

        setDependency(upstream : string, downstream : string) : ProjectDependency {
            let p1 = this._projects.get(upstream);
            let p2 = this._projects.get(downstream);
            let dep : ProjectDependency = {upstream : p1, downstream : p2};
            p1.downstreamDependencies = p1.downstreamDependencies.add(dep);
            p2.upstreamDependencies = p2.upstreamDependencies.add(dep);
            return dep;
        }

        private clearDependency(upstream : string, downstream : string) {
            let up = this.getProject(upstream);
            let down = this.getProject(downstream);

            let dep = up.downstreamDependencies.find((element, index, array) => element.downstream.repo == downstream
                        && element.upstream.repo == upstream);

            up.downstreamDependencies = up.downstreamDependencies.remove(dep);
            down.upstreamDependencies = down.upstreamDependencies.remove(dep);
        }

        updateDependencies(repo : string, upstreamDependencies : Array<string>) : Immutable.Set<ProjectDependency> {
            let project = this.getProject(repo);

            project.upstreamDependencies.forEach(dep => this.clearDependency(dep.upstream.repo, dep.downstream.repo));

            return Immutable.Set(upstreamDependencies.map(upstreamDep => this.setDependency(upstreamDep, repo)));

        }

    }

}