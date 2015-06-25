///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>
var Immutable = require('immutable');
var model;
(function (model) {
    var Project = (function () {
        function Project(repo) {
            this.upstreamDependencies = Immutable.Set();
            this.downstreamDependencies = Immutable.Set();
            this.repo = repo;
        }
        Project.prototype.toJSONObject = function () {
            var result = { repo: this.repo };
            result.upstreamDependencies = [];
            result.downstreamDependencies = [];
            this.upstreamDependencies.forEach(function (dep) { return result.upstreamDependencies.push(dep.upstream.repo); });
            this.downstreamDependencies.forEach(function (dep) { return result.downstreamDependencies.push(dep.downstream.repo); });
            return result;
        };
        return Project;
    })();
    model.Project = Project;
    var BuildQueue = (function () {
        function BuildQueue() {
            this._queue = [];
            this._finished = [];
            this._activeBuilds = Immutable.Set();
        }
        /** adds a project to the queue */
        BuildQueue.prototype.add = function (repo) {
            this._queue.push(repo);
        };
        /** moves a project to active builds and returns the activated project */
        BuildQueue.prototype.next = function () {
            if (this.queueIsEmpty() || this.maxConcurrentBuildsReached()) {
                return null;
            }
            for (var i = 0; i < this._queue.length; i++) {
                var nextRequest = this._queue[i];
                if (!this.isActive(nextRequest.repo)) {
                    this._activeBuilds = this._activeBuilds.add(nextRequest);
                    this._queue.splice(i, 1);
                    return nextRequest;
                }
            }
            return null;
        };
        /** finishes an active build, removing it from the set of active builds */
        BuildQueue.prototype.finish = function (repo) {
            this._activeBuilds = this._activeBuilds.delete(repo);
            this._finished.push(repo);
        };
        /** project builds that are active at the moment */
        BuildQueue.prototype.activeBuilds = function () {
            return this._activeBuilds;
        };
        BuildQueue.prototype.queue = function () {
            return this._queue;
        };
        BuildQueue.prototype.finished = function () {
            return this._finished;
        };
        BuildQueue.prototype.isActive = function (repo) {
            return this._activeBuilds.some(function (activeBuild) { return activeBuild.repo == repo; });
        };
        BuildQueue.prototype.maxConcurrentBuildsReached = function () {
            return this._activeBuilds.count() >= 1;
        };
        BuildQueue.prototype.queueIsEmpty = function () {
            return this._queue.length <= 0;
        };
        return BuildQueue;
    })();
    model.BuildQueue = BuildQueue;
    var AllProjects = (function () {
        function AllProjects() {
            this._projects = Immutable.Map();
        }
        AllProjects.prototype.populateTestData = function () {
            this.addNewProject('mserranom/lean-ci-testA');
            this.addNewProject('mserranom/lean-ci-testB');
            this.addNewProject('mserranom/lean-ci');
        };
        AllProjects.prototype.getProjects = function () {
            var projects = [];
            this._projects.forEach(function (project, repo) { return projects.push(project); });
            return projects;
        };
        AllProjects.prototype.getProject = function (repo) {
            return this._projects.get(repo);
        };
        AllProjects.prototype.addNewProject = function (repo) {
            var project = new Project(repo);
            this._projects = this._projects.set(repo, project);
        };
        AllProjects.prototype.setDependency = function (upstream, downstream) {
            var p1 = this._projects.get(upstream);
            var p2 = this._projects.get(downstream);
            var dep = { upstream: p1, downstream: p2 };
            p1.downstreamDependencies = p1.downstreamDependencies.add(dep);
            p2.upstreamDependencies = p2.upstreamDependencies.add(dep);
            return dep;
        };
        AllProjects.prototype.clearDependency = function (upstream, downstream) {
            var up = this.getProject(upstream);
            var down = this.getProject(downstream);
            var dep = up.downstreamDependencies.find(function (element, index, array) { return element.downstream.repo == downstream
                && element.upstream.repo == upstream; });
            up.downstreamDependencies = up.downstreamDependencies.remove(dep);
            down.upstreamDependencies = down.upstreamDependencies.remove(dep);
        };
        AllProjects.prototype.updateDependencies = function (repo, upstreamDependencies) {
            var _this = this;
            var project = this.getProject(repo);
            project.upstreamDependencies.forEach(function (dep) { return _this.clearDependency(dep.upstream.repo, dep.downstream.repo); });
            return Immutable.Set(upstreamDependencies.map(function (upstreamDep) { return _this.setDependency(upstreamDep, repo); }));
        };
        return AllProjects;
    })();
    model.AllProjects = AllProjects;
})(model = exports.model || (exports.model = {}));
