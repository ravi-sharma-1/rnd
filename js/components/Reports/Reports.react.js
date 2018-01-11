import React from 'react';
import './Reports.scss';
import DailyReconciliation from './DailyReconciliation/DailyReconciliation.react';
import DistributorReport from './DistributorReport/DistributorReport.react';
import ETaxReport from './ETaxReport/ETaxReport.react';
import QuickReport from './QuickReport/QuickReport.react';

var _this;

/* This component is responsible for switching of the right side view containing the form that needs to be filled for getting the report. */
class Reports extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedReport: 'daily'
        };
        _this = this;
    }

    selectReport(input) {
        _this.setState({ selectedReport: input });
    }

    render() {
        const { selectedReport } = _this.state;
        return (
            <div className='reports'>
                <div className='left'>
                    <div className={_this.state.selectedReport === 'daily' ? 'type selectedType' : 'type'} onClick={() => { _this.selectReport('daily'); }}>
                        <div className='text'>Reconciliation Report</div>
                    </div>
                    <div className={_this.state.selectedReport === 'distributor' ? 'type selectedType' : 'type'} onClick={() => { _this.selectReport('distributor'); }}>
                        <div className='text'>Distributor Report</div>
                    </div>
                    <div className={_this.state.selectedReport === 'eTax' ? 'type selectedType' : 'type'} onClick={() => { _this.selectReport('eTax'); }}>
                        <div className='text'>Entertainment Tax Report</div>
                    </div>
                    <div className={_this.state.selectedReport === 'quick' ? 'type selectedType' : 'type'} onClick={() => { _this.selectReport('quick'); }}>
                        <div className='text'>Quick Report</div>
                    </div>
                </div>
                <div className='right'>
                    {selectedReport === 'daily' && <DailyReconciliation />}
                    {selectedReport === 'distributor' && <DistributorReport isMaster={this.props.isMaster} />}
                    {selectedReport === 'eTax' && <ETaxReport isMaster={this.props.isMaster} />}
                    {selectedReport === 'quick' && <QuickReport />}
                </div>
            </div>
        );
    }
}

export default Reports;