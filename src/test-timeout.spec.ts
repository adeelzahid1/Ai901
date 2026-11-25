// The first test of a run may have to download the whole question bank, which can take
// longer than Jasmine's 5 seconds on a busy CI machine.
jasmine.DEFAULT_TIMEOUT_INTERVAL = 20_000;
