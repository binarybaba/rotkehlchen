var settings = require("./settings.js")();
require("./elements.js")();
require("./utils.js")();

function create_taxreport_ui() {
    var str = page_header('Tax Report');
    str += form_entry('Start Date', 'analysis_start_date', '', '');
    str += form_entry('End Date', 'analysis_end_date', '', '');
    str += form_button('Generate Report', 'generate_report');
    str += invisible_anchor('tax_report_anchor');
    str += table_html(2, 'report_overview');
    str += table_html(10, 'report_details');
    $('#page-wrapper').html(str);
}

function add_taxreport_listeners() {
    $('#analysis_start_date').datetimepicker({format: settings.datetime_format});
    $('#analysis_end_date').datetimepicker({format: settings.datetime_format});
    $('#generate_report').click(generate_report_callback);
}

function generate_report_callback(event) {
    event.preventDefault();
    let start_ts = $('#analysis_start_date').val();
    let end_ts = $('#analysis_end_date').val();

    start_ts = date_text_to_utc_ts(start_ts);
    end_ts = date_text_to_utc_ts(end_ts);
    now_ts = utc_now();
    if (end_ts <= start_ts) {
        showAlert('alert-danger', 'The end time should be after the start time.');
        return;
    }

    if (end_ts > now_ts) {
        showAlert('alert-danger', 'The end time should not be in the future.');
        return;
    }
    let str = loading_placeholder('tax_report_loading');
    $(str).insertAfter('#tax_report_anchor');

    client.invoke(
        "process_trade_history_async",
        start_ts,
        end_ts,
        (error, res) => {
            if (error || res == null) {
                showAlert('alert-danger', 'Error at process trade history' + error);
                return;
            }
            // else
            create_task(
                res['task_id'],
                'process_trade_history',
                'Create tax report'
            );
        });
}

function show_float_or_empty(data) {
    if (data == '') {
        return '';
    }
    return parseFloat(data).toFixed(settings.floating_precision);
}

function create_taxreport_overview(results) {
    $('#tax_report_loading').remove();
    let data = [];
    for (var result in results) {
        if(results.hasOwnProperty(result)) {
            let row = {'result': result, 'value': results[result]};
            data.push(row);
        }
    }
    let init_obj = {
        "data": data,
        "columns": [
            {'data': 'result', 'title': 'Result'},
            {
                'data': 'value',
                "title": settings.main_currency.ticker_symbol + ' value',
                "render": function (data, type, row) {
                    return format_currency_value(data);
                }
            }
        ],
        "order": [[1, 'desc']]
    };
    let table = $('#report_overview_table').DataTable(init_obj);
}

function create_taxreport_details(all_events) {
    let init_obj = {
        "data": all_events,
        "columns": [
            {'data': 'type', 'title': 'Type'},
            {
                'data': 'paid_in_profit_currency',
                'title': 'Paid in ' + settings.main_currency.ticker_symbol,
                'render': function (data, type, row) {
                    // it's already in main currency
                    return show_float_or_empty(data);
                }
            },
            {'data': 'paid_asset', 'title': 'Paid Asset'},
            {
                'data': 'paid_in_asset',
                'title': 'Paid In Asset',
                'render': function (data, type, row) {
                    return show_float_or_empty(data);
                }
            },
            {
                'data': 'taxable_amount',
                'title': 'Taxable Amount',
                'render': function (data, type, row) {
                    return show_float_or_empty(data);
                }
            },
            {
                'data': 'taxable_bought_cost',
                'title': 'Taxable Bought Cost',
                'render': function (data, type, row) {
                    return show_float_or_empty(data);
                }
            },
            {'data': 'received_asset', 'title': 'Received Asset'},
            {
                'data': 'received_in_profit_currency',
                'title': 'Received in ' + settings.main_currency.ticker_symbol,
                'render': function (data, type, row) {
                    // it's already in main currency
                    return show_float_or_empty(data);
                }
            },
            {
                'data': 'time',
                'title': 'Time',
                'render': function (data, type, row) {
                    if (type == 'sort') {
                        return data;
                    }
                    return timestamp_to_date(data);
                }
            },
            {'data': 'is_virtual', 'title': 'Virtual ?'}
        ],
        "pageLength": 25,
        'order': [[8, 'asc']]
    };
    let table = $('#report_details_table').DataTable(init_obj);
}

function init_taxreport() {
    monitor_add_callback('process_trade_history', function (result) {
        create_taxreport_overview(result['overview']);
        create_taxreport_details(result['all_events']);
        // also save the page
        settings.page_taxreport = $('#page-wrapper').html();
    });
}

module.exports = function() {
    this.init_taxreport = init_taxreport;
    this.create_taxreport_ui = create_taxreport_ui;
    this.add_taxreport_listeners = add_taxreport_listeners;
};
