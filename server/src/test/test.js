const assert = require('assert').strict;
const describe = require('mocha').describe;
const it = require('mocha').it;
const {Table} = require('../poker-logic');

describe('Table', function () {
    describe('AddPlayer', function () {
        it('should add player in first available seat', function() {
            let t= new Tab(1, 2, 2, 10, 10, 100, 0);
            t.AddPlayer('foo', 50, false);
            assert.equal(t.allPlayers[0].playerName, 'foo');
            assert.equal(t.allPlayers[0].chips, 50);
            assert.equal(t.allPlayers[0].isStraddling, false);
        })
    });
    describe('removePlayer', function () {
        it('should set leavingGame to false', function() {
            let t= new Tab(1, 2, 2, 10, 10, 100, 0);
            t.AddPlayer('p1', 50, false);
            t.AddPlayer('p2', 55, false);
            t.AddPlayer('p3', 55, false);
            for (const p of t.players) {
                t.allPlayers[p.seat].inHand = true;
            }
            t.removePlayer('p2');
            assert.equal(t.allPlayers[1].leavingGame, true);
        });
    });
    describe('removeAndAddPlayers', function () {
        it('sets removed players to null', function() {
            let t= new Tab(1, 2, 2, 10, 10, 100, 0);
            for (let i = 0; i < 7; i++) {
                t.AddPlayer(`p${i}`, 50, false);
            }
            for (const p of t.players) {
                p.inHand = true;
            }
            t.dealer = 6;
            for (let i=0; i<4; i++) {
                assert.equal( t.removePlayer(`p${i*2}`), true);
            }
            for (let i = 0; i< 7;i++) {
                assert.equal(t.AddPlayer(`z${i}`, 50, false), true);
            }
            t.removeAndAddPlayers();
            // for (let i=0; i<4; i++) {
            //     assert.equal(t.allPlayers[i*2], null);
            // }
            console.log(t.allPlayers);
            console.log(t.dealer);
        });
    })
});
