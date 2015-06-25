///<reference path="../../../lib/node-0.10.d.ts"/>
///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/mocha.d.ts"/>
///<reference path="../../../src/main/ts/model.ts"/>

import {model} from '../../../src/main/ts/model';
import {expect} from 'chai';

class BuildRequestImpl implements model.BuildRequest {

    constructor(repo : string) {
       this.repo = repo;
    }

    id:string;
    repo:string;
    commit:string;
    pingURL:string;

}

describe('BuildQueue: ', () => {

    let repo1Build = new BuildRequestImpl('repo1');
    let repo1Build2 = new BuildRequestImpl('repo1');
    let repo2Build = new BuildRequestImpl('repo');

    it('next() should be initially null',() => {
        let queue = new model.BuildQueue();
        expect(queue.next()).to.be.null;
    });

    it('first added project should be returned with next()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        expect(queue.next()).equals(repo1Build);
    });

    it('activeBuilds() should contain projects returned with next()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        queue.next();
        queue.add(repo2Build);
        queue.next();
        expect(queue.activeBuilds().size).equals(1);
        expect(queue.activeBuilds().contains(repo1Build)).to.be.true;
        expect(queue.activeBuilds().contains(repo2Build)).to.be.false;
    });

    it('finish() should remove projects from activeBuilds()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        expect(queue.next()).equals(repo1Build);
        expect(queue.activeBuilds().contains(repo1Build)).to.be.true;
        queue.finish(repo1Build);
        expect(queue.activeBuilds().contains(repo1Build)).to.be.false;
    });

    it('a 2nd scheduled build of the same project shouldnt be added to activeBuilds()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        queue.next();
        queue.add(repo1Build2);
        expect(queue.next()).to.be.null;
        expect(queue.activeBuilds().contains(repo1Build2)).to.be.false;
    });

    it('being 1 the max concurrent builds, projects shouldnt be added to activeBuilds with next() ',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        queue.next();
        queue.add(repo1Build2); //project added before the previous finishes
        queue.finish(repo1Build);
        queue.next();

        //there's another project in the queue: the dependant one, but there's another one active
        expect(queue.next()).to.be.null;
    });

});

describe('AllProjects: ', () => {

    let sut : model.AllProjects;

    beforeEach(() => {
        sut = new model.AllProjects();
    });

    it('should be empty initially',() => {
        expect(sut.getProjects()).to.be.empty;
    });

    it('should return added repos',() => {
        sut.addNewProject('group/repo1');
        sut.addNewProject('group/repo2');

        expect(sut.getProjects().length).equals(2);
        expect(sut.getProject('group/repo1')).not.to.be.null;
        expect(sut.getProject('group/repo2')).not.to.be.null;
    });

    it('should return null for non existing repo',() => {
        expect(sut.getProject('group/foo')).to.be.undefined;
    });

    it('should set dependencies for existing projects',() => {
        sut.addNewProject('group/repo1');
        sut.addNewProject('group/repo2');
        let dep = sut.setDependency('group/repo1', 'group/repo2');

        let up = sut.getProject('group/repo1');
        let down = sut.getProject('group/repo2');

        expect(up.downstreamDependencies.contains(dep)).to.be.true;
        expect(up.upstreamDependencies.contains(dep)).to.be.false;

        expect(down.upstreamDependencies.contains(dep)).to.be.true;
        expect(down.downstreamDependencies.contains(dep)).to.be.false;
    });

    it('updating dependencies should remove existing dependencies',() => {
        sut.addNewProject('group/repo1');
        sut.addNewProject('group/repo2');
        sut.addNewProject('group/repo3');

        let repo1 = sut.getProject('group/repo1');
        let repo2 = sut.getProject('group/repo2');
        let repo3 = sut.getProject('group/repo3');

        let dep = sut.setDependency('group/repo1', 'group/repo2');
        expect(repo1.downstreamDependencies.contains(dep)).to.be.true;
        expect(repo2.upstreamDependencies.contains(dep)).to.be.true;

        sut.updateDependencies('group/repo2', ['group/repo3']);
        expect(repo1.downstreamDependencies.contains(dep)).to.be.false;
        expect(repo2.upstreamDependencies.contains(dep)).to.be.false;
    });

    it('updating dependencies should set new dependencies on projects',() => {
        sut.addNewProject('group/repo1');
        sut.addNewProject('group/repo2');
        sut.addNewProject('group/repo3');

        let repo1 = sut.getProject('group/repo1');
        let repo2 = sut.getProject('group/repo2');
        let repo3 = sut.getProject('group/repo3');

        sut.setDependency('group/repo1', 'group/repo2');

        let newDeps = sut.updateDependencies('group/repo2', ['group/repo3']);
        newDeps.first();

        expect(newDeps.size).equals(1);
        expect(repo2.upstreamDependencies.contains(newDeps.first())).to.be.true;
        expect(repo3.downstreamDependencies.contains(newDeps.first())).to.be.true;
    });

    it('should be able to update multiple dependencies on projects',() => {
        sut.addNewProject('group/repo1');
        sut.addNewProject('group/repo2');
        sut.addNewProject('group/repo3');
        sut.addNewProject('group/repo4');

        let repo1 = sut.getProject('group/repo1');
        let repo2 = sut.getProject('group/repo2');
        let repo3 = sut.getProject('group/repo3');
        let repo4 = sut.getProject('group/repo4');

        sut.setDependency('group/repo1', 'group/repo2');

        let newDeps = sut.updateDependencies('group/repo2', ['group/repo3', 'group/repo4']);

        expect(newDeps.size).equals(2);
        expect(repo2.upstreamDependencies.size).equals(2);
        newDeps.forEach(dep => {
           repo2.downstreamDependencies.forEach(downDep => expect(downDep.upstream).equals(repo2))
        });
    });


});



