/*
 This file general configuration for whole DB

 On adding a new table into DB just add here, and the CRUD operation is supported.
 selectFilter :- Field by which we can select/search table. To add select filter which is
 not a column of table provide in new line for better clearity with comments
 and also handle it customly generic will not handle it.
 addFilter :- Field that are allowed to be added in table
 updateFilter: Field that are allowed to be updated in table
 requiredFields: Fields that are mandatory, while adding.

 Note:- every table should have is_enabled field and is_enabled is by default=1 while searching
 */
// 'use strict';


// TODO: convert all indexedFields/indexName to array, to avoid else part while store creation
const schema = {
    cinemas: {
        name: 'cinemas',
        keyPath: 'id',
        indexedFields: 'id',
        indexName: 'cinemaIndex',
        addFilter: ['id', 'name', 'city', 'pin', 'address', 'cutoff_time', 'pos_cutoff_time', /*'gstin', 'sac_movies', 'sac_3d', 'invoice',*/ 'created_at', 'updated_at']
    },

    movies: {
        name: 'movies',
        keyPath: 'id',
        indexedFields: 'id',
        indexName: 'movieIndex',
        addFilter: ['id', 'display', 'duration', 'language', 'projection', 'censor', 'is_active', 'created_at', 'updated_at']
    },
    sessions: {
        name: 'sessions',
        keyPath: 'id',
        indexedFields: ['id', 'isOnline'],
        isIndexUnique: [true, false],
        indexName: ['sessionsIndex', 'syncsessionIndex'],
        //addFilter: ['id', 'audi_id', 'movie_id', 'inst_duration', 'start_date_time', 'end_date_time', 'categories','created_at', 'updated_at']
        addFilter: ['id', 'audi_id', 'movie_id', 'inst_duration', 'start_date_time', 'end_date_time', 'categories', 'isOnline']
    },

    audis: {
        name: 'audis',
        keyPath: 'id',
        indexedFields: 'id',
        indexName: 'audiIndex',
        addFilter: ['id', 'name', 'layout', 'seat_category_map', 'seat_count', 'max_rows', 'max_cols',
            'free_seating', 'screen_on_top', 'is_active', 'created_at', 'updated_at']
    },

    users: {
        name: 'users',
        keyPath: 'id',
        indexedFields: 'phone_number',
        indexName: 'userIndex',
        addFilter: ['id', 'phone_number', 'role_id', 'password', 'salt', 'username',
            'is_active', 'created_at', 'updated_at']
    },

    bookings: {
        name: 'bookings',
        keyPath: 'booking_id',
        indexedFields: ['booking_id', 'ssn_instance_id', 'isOnline', 'status', 'tele_book_no'],
        isIndexUnique: [true, false, false, false, false],
        indexName: ['bookingsIndex', 'instanceIdIndex', 'syncIndex', 'bookingStatus', 'teleIndex'],
        addFilter: ['booking_id', 'ssn_instance_id', 'seat_count', 'seat_details', 'pax_info', 'tele_book_no',
            'status', 'print_status', 'pos_user_id', 'isOnline', 'payment_mode', 'booking_type', 'invoice', 'created_at', 'updated_at'],
        reqdFilter: ['booking_id', 'ssn_instance_id', 'seat_count', 'seat_details', 'status', 'print_status', 'pos_user_id', 'isOnline']
    },

    masterInfo: {
        name: 'masterInfo',
        keyPath: 'id',
        indexedFields: 'id',
        indexName: 'masterInfoIndex',
        addFilter: ['id', 'is_master', 'machine_id', 'transaction_id']
    },
    logs: {
        name: 'logs',
        keyPath: 'id',
        indexedFields: 'id',
        indexName: 'logsIndex',
        addFilter: ['id', 'time', 'message', 'user_id']
    },
    sessionSeatingInfo: {
        name: 'sessionSeatingInfo',
        keyPath: 'id',
        indexedFields: 'id',
        indexName: 'sessSeatInfo',
        addFilter: ['id']
    }
};

const requiredTablesForFirstTimeSync = ['cinemas', 'audis', 'users'];

module.exports = { schema, requiredTablesForFirstTimeSync };
