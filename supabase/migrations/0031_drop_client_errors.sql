-- Error reporting moved to Firebase Crashlytics (it also catches native crashes), so the
-- home-made client_errors table from 0030 goes again. It never held any reports.

select cron.unschedule('purge-client-errors');
drop function if exists purge_client_errors();
drop function if exists report_client_error(text, text, text, text, text, text);
drop table if exists client_errors;
