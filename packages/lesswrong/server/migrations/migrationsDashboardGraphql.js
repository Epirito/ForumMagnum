import { defineQuery } from '../utils/serverGraphqlUtil.js';
import Migrations from '../../lib/collections/migrations/collection.js';
import { availableMigrations } from './migrationUtils.js';

defineQuery({
  name: "MigrationsDashboard",
  resultType: "MigrationsDashboardData",
  schema: `
    type MigrationsDashboardData {
      migrations: [MigrationStatus!]
    }
    type MigrationStatus {
      name: String!
      dateWritten: String
      runs: [MigrationRun!]
    }
    type MigrationRun {
      name: String!
      started: Date!
      finished: Date
      succeeded: Boolean
    }`,
  fn: async (root, args, context) => {
    if (!context.currentUser || !context.currentUser.isAdmin)
      throw new Error("MigrationsDashboard graphQL API requires being logged in as an admin");
    
    const allMigrationRuns = Migrations.find({}).fetch();
    const runsByMigration = _.groupBy(allMigrationRuns, m=>m.name);
    
    const migrationNamesByDateWrittenDesc =
      _.sortBy(
        _.pairs(availableMigrations),
        ([name, {dateWritten}]) => dateWritten
      )
      .reverse()
      .map(([name, migration]) => name);
    
    return {
      migrations: migrationNamesByDateWrittenDesc
        .map(name => ({
          name,
          dateWritten: availableMigrations[name].dateWritten,
          runs: runsByMigration[name]?.map(run => ({
            name: run.name,
            started: new Date(run.started),
            finished: run.finished ? new Date(run.finished) : null,
            succeeded: run.succeeded,
          })) || [],
        }))
    };
  },
});
